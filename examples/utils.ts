/**
 * Shared utilities for example scripts
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * MCP JSON-RPC request structure
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * MCP JSON-RPC response structure
 */
export interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content?: Array<{
      type: string;
      text?: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Result from running an MCP tool call
 */
export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  rawResponse?: string;
  stderr?: string;
}

/**
 * Start the MCP server process
 */
export function startMCPServer(): ChildProcess {
  const serverPath = path.join(__dirname, '..', 'dist', 'mcp-server.js');
  return spawn('node', [serverPath], {
    env: process.env
  });
}

/**
 * Send a JSON-RPC request to the MCP server
 */
export function sendMCPRequest(
  server: ChildProcess,
  toolName: string,
  args: Record<string, unknown>
): void {
  const request: MCPRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };
  
  server.stdin?.write(JSON.stringify(request) + '\n');
}

/**
 * Parse MCP response from server output
 */
export function parseMCPResponse(responseData: string): MCPToolResult {
  try {
    const lines = responseData.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const mcpResponse: MCPResponse = JSON.parse(lastLine);
    
    // Check for JSON-RPC error
    if (mcpResponse.error) {
      return {
        success: false,
        error: mcpResponse.error.message,
        rawResponse: responseData
      };
    }
    
    // Extract the tool result content
    if (mcpResponse.result?.content?.[0]) {
      const content = mcpResponse.result.content[0];
      if (content.type === 'text' && content.text) {
        try {
          const data = JSON.parse(content.text);
          return {
            success: true,
            data
          };
        } catch {
          // Text content is not JSON
          return {
            success: true,
            data: content.text
          };
        }
      }
    }
    
    // Return full response if we can't extract content
    return {
      success: true,
      data: mcpResponse,
      rawResponse: responseData
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse response: ${e instanceof Error ? e.message : 'Unknown error'}`,
      rawResponse: responseData
    };
  }
}

/**
 * Run an MCP tool and return the result
 * 
 * @param toolName - Name of the tool to call
 * @param args - Tool arguments
 * @param timeout - Timeout in milliseconds (default: 10000)
 */
export async function runMCPTool(
  toolName: string,
  args: Record<string, unknown>,
  timeout: number = 10000
): Promise<MCPToolResult> {
  return new Promise((resolve) => {
    const server = startMCPServer();
    let responseData = '';
    let errorData = '';

    server.stdout?.on('data', (data: Buffer) => {
      responseData += data.toString();
    });

    server.stderr?.on('data', (data: Buffer) => {
      errorData += data.toString();
    });

    // Send the request after a short delay to let server start
    setTimeout(() => {
      sendMCPRequest(server, toolName, args);
    }, 1000);

    // Wait for response
    setTimeout(() => {
      if (responseData) {
        const result = parseMCPResponse(responseData);
        if (errorData) {
          result.stderr = errorData;
        }
        resolve(result);
      } else if (errorData) {
        resolve({
          success: false,
          error: 'Server error',
          stderr: errorData
        });
      } else {
        resolve({
          success: false,
          error: 'No response received'
        });
      }
      
      server.kill();
    }, timeout);

    server.on('error', (error: Error) => {
      resolve({
        success: false,
        error: `Error starting server: ${error.message}`
      });
    });
  });
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Output result as formatted JSON
 */
export function outputJSON(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Show error message and exit
 */
export function exitWithError(message: string, code: number = 1): never {
  console.error(`❌ Error: ${message}\n`);
  process.exit(code);
}
