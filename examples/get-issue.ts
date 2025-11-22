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

import * as dotenv from 'dotenv';
import { runMCPTool, outputJSON, isValidUUID, exitWithError } from './utils';

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
  exitWithError('issue_uuid is required');
}

if (!isValidUUID(issueId)) {
  console.error('❌ Error: issue_id must be a valid UUID format');
  console.error('   Example: 4a18d42f-0706-4ad0-b127-24078731fbed\n');
  console.error('   You provided:', issueId);
  console.error('\nNote: If you have an issue key like "SNYK-JAVA-...", you need to use');
  console.error('      the get-issues.ts script first to find the corresponding UUID.\n');
  process.exit(1);
}

console.log(`🔍 Retrieving issue: ${issueId}\n`);

// Run the MCP tool
(async () => {
  const result = await runMCPTool('get_issue', { issue_id: issueId });

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
