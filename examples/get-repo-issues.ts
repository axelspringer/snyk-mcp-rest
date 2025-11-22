#!/usr/bin/env node

/**
 * Example script for the get_repo_issues tool in Snyk MCP Server
 * 
 * Retrieves issues for all projects matching a repository name.
 * 
 * Usage: npx ts-node examples/get-repo-issues.ts <repository-name> [status] [severity]
 * 
 * Examples:
 *   npx ts-node examples/get-repo-issues.ts spring-media/apps-android-news
 *   npx ts-node examples/get-repo-issues.ts myRepo open high
 *   npx ts-node examples/get-repo-issues.ts "github.com/user/repo" resolved
 */

import * as dotenv from 'dotenv';
import { runMCPTool, outputJSON, exitWithError } from './utils';

dotenv.config();

// Show usage information
function showUsage(): void {
  console.log(`
📖 Usage: npx ts-node examples/get-repo-issues.ts <repository-name> [status] [severity]

Parameters:
  repository-name  Repository name or prefix to search for - required
  status          Issue status: open, resolved, ignored - optional (default: open)
  severity        Issue severity: low, medium, high, critical - optional

Environment Variables Required:
  SNYK_API_KEY    Your Snyk API key
  SNYK_ORG_ID     Your Snyk organization ID
  SNYK_ORG_SLUG   Your Snyk organization slug

Examples:
  npx ts-node examples/get-repo-issues.ts spring-media/apps-android-news
    → Get open issues for repository

  npx ts-node examples/get-repo-issues.ts myRepo open high
    → Get open high-severity issues

  npx ts-node examples/get-repo-issues.ts "github.com/user/repo" resolved
    → Get all resolved issues for repository
`);
  process.exit(0);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
}

// Check for required environment variables
if (!process.env.SNYK_API_KEY) {
  exitWithError('SNYK_API_KEY environment variable is required');
}

if (!process.env.SNYK_ORG_ID) {
  exitWithError('SNYK_ORG_ID environment variable is required');
}

if (!process.env.SNYK_ORG_SLUG) {
  exitWithError('SNYK_ORG_SLUG environment variable is required');
}

// Get parameters from command line arguments
const repositoryName = process.argv[2];
if (!repositoryName) {
  exitWithError('repository-name parameter is required');
}

const status = process.argv[3] || 'open';
const severity = process.argv[4];

// Validate status
const validStatuses = ['open', 'resolved', 'ignored'];
if (!validStatuses.includes(status)) {
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

console.log(`🔍 Fetching issues for repository: ${repositoryName}`);
console.log(`📊 Status filter: ${status}`);
if (severity) {
  console.log(`🔍 Severity filter: ${severity}`);
}
console.log();

// Build request arguments
const args: Record<string, unknown> = {
  repositoryName,
  status
};

if (severity) {
  args.severity = severity;
}

// Run the MCP tool
(async () => {
  const result = await runMCPTool('get_repo_issues', args);

  if (!result.success) {
    console.error('❌ Error:', result.error);
    if (result.stderr) {
      console.error('\n⚠️  Server output (stderr):');
      console.error(result.stderr);
    }
    process.exit(1);
  }

  outputJSON(result.data);
})();

