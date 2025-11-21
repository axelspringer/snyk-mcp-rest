#!/usr/bin/env node

/**
 * Test script for the Snyk MCP Server
 * 
 * Sends a test request to the MCP server and displays the response.
 * Useful for testing without Claude Desktop.
 * 
 * Usage: npx ts-node examples/get-issues.ts [repo-name] [status] [severity]
 * 
 * Examples:
 *   npx ts-node examples/get-issues.ts                                    # All open issues
 *   npx ts-node examples/get-issues.ts owner/repo                         # Open issues for specific repo
 *   npx ts-node examples/get-issues.ts owner/repo resolved                # Resolved issues for repo
 *   npx ts-node examples/get-issues.ts owner/repo open critical           # Critical open issues for repo
 *   npx ts-node examples/get-issues.ts "" resolved high                   # All resolved high severity issues
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface RequestArguments {
  repo?: string;
  status: string;
  severity?: string;
}

// Show usage information
function showUsage(): void {
  console.log(`
📖 Usage: npx ts-node examples/get-issues.ts [repo] [status] [severity]

Parameters:
  repo      Repository name (e.g., "owner/repo") or Project ID (UUID) - optional
  status    Issue status: open, resolved, ignored - optional (default: open)
  severity  Issue severity: low, medium, high, critical - optional

Examples:
  npx ts-node examples/get-issues.ts
    → All open issues

  npx ts-node examples/get-issues.ts owner/repo
    → Open issues for specific repository

  npx ts-node examples/get-issues.ts owner/repo resolved
    → Resolved issues for repository

  npx ts-node examples/get-issues.ts owner/repo open critical
    → Critical open issues for repository

  npx ts-node examples/get-issues.ts "" resolved high
    → All resolved high severity issues (empty string skips repo filter)

  npx ts-node examples/get-issues.ts 12345678-1234-1234-1234-123456789012
    → Open issues for project ID (UUID format)
`);
  process.exit(0);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
}

// Get repo, status, and severity from command line arguments
const repo = process.argv[2];
const status = process.argv[3];
const severity = process.argv[4];

// Validate status if provided
const validStatuses = ['open', 'resolved', 'ignored'];
if (status && !validStatuses.includes(status)) {
  console.error(`❌ Invalid status: "${status}"`);
  console.error(`   Valid values: ${validStatuses.join(', ')}\n`);
  showUsage();
}

// Validate severity if provided
const validSeverities = ['low', 'medium', 'high', 'critical'];
if (severity && !validSeverities.includes(severity)) {
  console.error(`❌ Invalid severity: "${severity}"`);
  console.error(`   Valid values: ${validSeverities.join(', ')}\n`);
  showUsage();
}

// Build test request arguments
const requestArguments: RequestArguments = {
  status: status || 'open' // Default status
};

if (repo && repo !== '') {
  requestArguments.repo = repo;
  console.log(`📦 Testing with repository: ${repo}\n`);
}

if (status) {
  console.log(`📊 Filtering by status: ${status}\n`);
}

if (severity) {
  requestArguments.severity = severity;
  console.log(`🔍 Filtering by severity: ${severity}\n`);
}

// Test request for get_issues
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'get_issues',
    arguments: requestArguments
  }
};

console.log('🚀 Starting MCP Server test...\n');
console.log('📨 Sending request:');
console.log(JSON.stringify(testRequest, null, 2));
console.log('\n⏳ Waiting for response...\n');

// Start the MCP server
const serverPath = path.join(__dirname, '..', 'dist', 'start-mcp-server.js');
const server = spawn('node', [serverPath], {
  env: process.env
});

let responseData = '';
let errorData = '';

server.stdout.on('data', (data: Buffer) => {
  responseData += data.toString();
});

server.stderr.on('data', (data: Buffer) => {
  errorData += data.toString();
});

// Send the test request after short delay
setTimeout(() => {
  server.stdin.write(JSON.stringify(testRequest) + '\n');
}, 1000);

// Wait for response
setTimeout(() => {
  if (responseData) {
    console.log('✅ Response received:\n');
    
    try {
      // Parse the MCP response
      const lines = responseData.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const mcpResponse = JSON.parse(lastLine);
      
      // Extract the issue content
      if (mcpResponse.result?.content?.[0]) {
        const content = mcpResponse.result.content[0];
        if (content.type === 'text') {
          const issuesData = JSON.parse(content.text);
          console.log(JSON.stringify(issuesData, null, 2));
        } else {
          console.log(JSON.stringify(mcpResponse, null, 2));
        }
      } else {
        console.log(JSON.stringify(mcpResponse, null, 2));
      }
    } catch (e) {
      // Fallback: Show raw response
      console.log(responseData);
    }
  }
  
  if (errorData) {
    console.log('\n⚠️  Server output (stderr):');
    console.log(errorData);
  }
  
  if (!responseData && !errorData) {
    console.log('❌ No response received');
  }
  
  server.kill();
  process.exit(0);
}, 5000);

server.on('error', (error: Error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});
