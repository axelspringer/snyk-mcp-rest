#!/usr/bin/env node

/**
 * Test-Skript für den Snyk MCP Server
 * 
 * Sendet eine Test-Anfrage an den MCP Server und zeigt die Antwort an.
 * Nützlich zum Testen ohne Claude Desktop.
 * 
 * Usage: node test-mcp-server.js [repo-name] [status] [severity]
 * 
 * Examples:
 *   node test-mcp-server.js                                    # All open issues
 *   node test-mcp-server.js owner/repo                         # Open issues for specific repo
 *   node test-mcp-server.js owner/repo resolved                # Resolved issues for repo
 *   node test-mcp-server.js owner/repo open critical           # Critical open issues for repo
 *   node test-mcp-server.js "" resolved high                   # All resolved high severity issues
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Show usage information
function showUsage() {
  console.log(`
📖 Usage: node test-mcp-server.js [repo] [status] [severity]

Parameters:
  repo      Repository name (e.g., "owner/repo") or Project ID (UUID) - optional
  status    Issue status: open, resolved, ignored - optional (default: open)
  severity  Issue severity: low, medium, high, critical - optional

Examples:
  node test-mcp-server.js
    → All open issues

  node test-mcp-server.js owner/repo
    → Open issues for specific repository

  node test-mcp-server.js owner/repo resolved
    → Resolved issues for repository

  node test-mcp-server.js owner/repo open critical
    → Critical open issues for repository

  node test-mcp-server.js "" resolved high
    → All resolved high severity issues (empty string skips repo filter)

  node test-mcp-server.js 12345678-1234-1234-1234-123456789012
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
const requestArguments = {};

if (repo && repo !== '') {
  requestArguments.repo = repo;
  console.log(`📦 Testing with repository: ${repo}\n`);
}

if (status) {
  requestArguments.status = status;
  console.log(`📊 Filtering by status: ${status}\n`);
} else {
  requestArguments.status = 'open'; // Default status
}

if (severity) {
  requestArguments.severity = severity;
  console.log(`🔍 Filtering by severity: ${severity}\n`);
}

// Test-Request für get_issues
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'get_issues',
    arguments: requestArguments
  }
};

console.log('🚀 Starte MCP Server Test...\n');
console.log('📨 Sende Request:');
console.log(JSON.stringify(testRequest, null, 2));
console.log('\n⏳ Warte auf Antwort...\n');

// Starte den MCP Server
const serverPath = path.join(__dirname, 'dist', 'start-mcp-server.js');
const server = spawn('node', [serverPath], {
  env: process.env
});

let responseData = '';
let errorData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();
});

server.stderr.on('data', (data) => {
  errorData += data.toString();
});

// Sende den Test-Request nach kurzer Verzögerung
setTimeout(() => {
  server.stdin.write(JSON.stringify(testRequest) + '\n');
}, 1000);

// Warte auf Antwort
setTimeout(() => {
  if (responseData) {
    console.log('✅ Antwort erhalten:\n');
    
    try {
      // Parse die MCP-Antwort
      const lines = responseData.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const mcpResponse = JSON.parse(lastLine);
      
      // Extrahiere den Issue-Content
      if (mcpResponse.result && mcpResponse.result.content && mcpResponse.result.content[0]) {
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
      // Fallback: Zeige rohe Antwort
      console.log(responseData);
    }
  }
  
  if (errorData) {
    console.log('\n⚠️  Server Output (stderr):');
    console.log(errorData);
  }
  
  if (!responseData && !errorData) {
    console.log('❌ Keine Antwort erhalten');
  }
  
  server.kill();
  process.exit(0);
}, 5000);

server.on('error', (error) => {
  console.error('❌ Fehler beim Starten des Servers:', error);
  process.exit(1);
});
