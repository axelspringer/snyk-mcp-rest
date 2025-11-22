#!/usr/bin/env node

/**
 * Example script for the find_projects tool in Snyk MCP Server
 * 
 * Searches for Snyk projects by name (repository name, file name, or any substring).
 * Useful for finding project IDs before querying issues.
 * 
 * Usage: npx ts-node examples/find-projects.ts <query>
 * 
 * Examples:
 *   npx ts-node examples/find-projects.ts my-repo                # Find all projects with "my-repo" in the name
 *   npx ts-node examples/find-projects.ts package.json           # Find all package.json projects
 *   npx ts-node examples/find-projects.ts Dockerfile             # Find all Dockerfile projects
 *   npx ts-node examples/find-projects.ts "github.com/user"      # Find all projects from a specific user
 */

import * as dotenv from 'dotenv';
import { runMCPTool, outputJSON, exitWithError } from './utils';

dotenv.config();

// Show usage information
function showUsage(): void {
  console.log(`
📖 Usage: npx ts-node examples/find-projects.ts <query>

Parameters:
  query       Search string to match against project names (case-insensitive)

Examples:
  npx ts-node examples/find-projects.ts my-repo
    → Find all projects with "my-repo" in the name

  npx ts-node examples/find-projects.ts package.json
    → Find all package.json projects

  npx ts-node examples/find-projects.ts Dockerfile
    → Find all Dockerfile projects

  npx ts-node examples/find-projects.ts "github.com/user"
    → Find all projects from a specific user

  npx ts-node examples/find-projects.ts pom.xml
    → Find all Maven (pom.xml) projects
`);
  process.exit(0);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
}

// Get query from command line arguments
const query = process.argv[2];

if (!query) {
  exitWithError('Query parameter is required');
}

console.log(`🔍 Searching for projects matching: "${query}"\n`);

// Run the MCP tool
(async () => {
  const result = await runMCPTool('find_projects', { query });

  if (!result.success) {
    outputJSON({
      error: result.error,
      stderr: result.stderr
    });
    process.exit(1);
  }

  outputJSON(result.data);
})();
