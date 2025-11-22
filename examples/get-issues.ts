#!/usr/bin/env node

/**
 * Test script for the Snyk MCP Server
 * 
 * Sends a test request to the MCP server and displays the response.
 * Useful for testing without Claude Desktop.
 * 
 * Usage: npx ts-node examples/get-issues.ts [project-id] [status] [severity]
 * 
 * Examples:
 *   npx ts-node examples/get-issues.ts                                    # All open issues
 *   npx ts-node examples/get-issues.ts 12345678-1234-1234-1234-123456789012  # Open issues for specific project
 *   npx ts-node examples/get-issues.ts 12345678-1234-1234-1234-123456789012 resolved  # Resolved issues for project
 *   npx ts-node examples/get-issues.ts 12345678-1234-1234-1234-123456789012 open critical  # Critical open issues
 *   npx ts-node examples/get-issues.ts "" resolved high                  # All resolved high severity issues
 */

import * as dotenv from 'dotenv';
import { runMCPTool, outputJSON } from './utils';

dotenv.config();

// Show usage information
function showUsage(): void {
  console.log(`
📖 Usage: npx ts-node examples/get-issues.ts [project-id] [status] [severity]

Parameters:
  project-id  Project ID in UUID format (e.g., "12345678-1234-1234-1234-123456789012") - optional
  status      Issue status: open, resolved, ignored - optional (default: open)
  severity    Issue severity: low, medium, high, critical - optional

Examples:
  npx ts-node examples/get-issues.ts
    → All open issues

  npx ts-node examples/get-issues.ts 12345678-1234-1234-1234-123456789012
    → Open issues for specific project

  npx ts-node examples/get-issues.ts 12345678-1234-1234-1234-123456789012 resolved
    → Resolved issues for project

  npx ts-node examples/get-issues.ts 12345678-1234-1234-1234-123456789012 open critical
    → Critical open issues for project

  npx ts-node examples/get-issues.ts "" resolved high
    → All resolved high severity issues (empty string skips project filter)
`);
  process.exit(0);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
}

// Get projectId, status, and severity from command line arguments
const projectId = process.argv[2];
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

// Build request arguments
const args: Record<string, unknown> = {
  status: status || 'open' // Default status
};

if (projectId && projectId !== '') {
  args.projectId = projectId;
  console.log(`📦 Testing with project ID: ${projectId}\n`);
}

if (status) {
  console.log(`📊 Filtering by status: ${status}\n`);
}

if (severity) {
  args.severity = severity;
  console.log(`🔍 Filtering by severity: ${severity}\n`);
}

// Run the MCP tool
(async () => {
  const result = await runMCPTool('get_issues', args);

  if (!result.success) {
    console.error('❌ Error:', result.error);
    if (result.stderr) {
      console.error('\n⚠️  Server output (stderr):');
      console.error(result.stderr);
    }
    process.exit(1);
  }

  console.log('✅ Response received:\n');
  outputJSON(result.data);
})();
