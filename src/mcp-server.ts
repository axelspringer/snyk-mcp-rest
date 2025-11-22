import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IssuesApi, ProjectsApi, Configuration } from './generated';
import { allTools } from './tools';

/**
 * Create MCP Server with all registered tools
 */
export function createMCPServer(apiKey?: string) {
  // Snyk API Configuration
  const config = new Configuration({
    apiKey: apiKey || process.env.SNYK_API_KEY,
    basePath: 'https://api.snyk.io/rest',
  });

  const issuesApi = new IssuesApi(config);
  const projectsApi = new ProjectsApi(config);

  // Create MCP Server using high-level API
  const server = new McpServer(
    {
      name: 'snyk-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools
  allTools.forEach((tool) => {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: any) => {
        try {
          return await tool.handler(args, {
            issuesApi,
            projectsApi,
          });
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Unknown error occurred');
        }
      }
    );
  });

  return server;
}

/**
 * Start MCP Server on stdio transport
 * This function is called when running as a standalone server
 */
export async function startMCPServer() {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { config: loadEnv } = await import('dotenv');
  
  // Load .env file when running locally
  loadEnv();
  
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Snyk MCP Server running on stdio');
}

// If this file is executed directly (not imported), start the server
if (require.main === module) {
  startMCPServer().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
