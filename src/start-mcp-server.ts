#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from './mcp-server.js';
import { config as loadEnv } from 'dotenv';

// Load .env file when running locally
loadEnv();

// Server starten
async function main() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Snyk MCP Server läuft auf stdio');
}

main().catch((error) => {
  console.error('Server Fehler:', error);
  process.exit(1);
});
