#!/usr/bin/env node

/**
 * Test script for the Snyk MCP Server - get_issue tool
 * 
 * Retrieves detailed information about a specific Snyk issue by its UUID.
 * Useful for testing without Claude Desktop.
 * 
 * Usage: npx ts-node examples/get-issue.ts <issue-uuid>
 * 
 * IMPORTANT: This requires the issue UUID (e.g., "4a18d42f-0706-4ad0-b127-24078731fbed"),
 * NOT the issue key (e.g., "SNYK-JAVA-ORGAPACHETOMCATEMBED-1373396").
 * You can get the UUID from the 'id' field in the list_issues output.
 * 
 * Examples:
 *   npx ts-node examples/get-issue.ts 12345678-1234-1234-1234-123456789012
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Show usage information
function showUsage(): void {
  console.log(`
📖 Usage: npx ts-node examples/get-issue.ts <issue-uuid>

Parameters:
  issue_uuid  The unique identifier (UUID) of the issue to retrieve - required

IMPORTANT: This requires the issue UUID (e.g., "4a18d42f-0706-4ad0-b127-24078731fbed"),
NOT the issue key (e.g., "SNYK-JAVA-..."). 

You can get the UUID from the 'id' field in the list_issues output, or use the 
examples/get-issues.ts script to find the UUID for a specific issue key.

Examples:
  npx ts-node examples/get-issue.ts 4a18d42f-0706-4ad0-b127-24078731fbed
    → Get detailed information for issue with this UUID
`);
  process.exit(0);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
}

// Get issue_id from command line arguments
const issueId = process.argv[2];

// Validate issue_id is provided and is a UUID
if (!issueId) {
  console.error('❌ Error: issue_uuid is required\n');
  showUsage();
}

// Basic UUID validation (not perfect but catches obvious issues)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(issueId)) {
  console.error('❌ Error: issue_id must be a valid UUID format');
  console.error('   Example: 4a18d42f-0706-4ad0-b127-24078731fbed\n');
  console.error('   You provided:', issueId);
  console.error('\nNote: If you have an issue key like "SNYK-JAVA-...", you need to use');
  console.error('      the get-issues.ts script first to find the corresponding UUID.\n');
  process.exit(1);
}

console.log(`🔍 Retrieving issue: ${issueId}\n`);

// Test request for get_issue
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'get_issue',
    arguments: {
      issue_id: issueId
    }
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
  const message = data.toString();
  errorData += message;
  // Show logs in real-time
  process.stderr.write(message);
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
          const issueData = JSON.parse(content.text);
          console.log(JSON.stringify(issueData, null, 2));
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
