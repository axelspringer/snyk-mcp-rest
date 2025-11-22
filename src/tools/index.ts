/**
 * MCP Tools Module
 * Exports all tool definitions and utilities
 */

export * from './types';
export * from './utils';
export * from './get-issues';
export * from './get-issue';
export * from './get-repo-issues';
export * from './find-projects';

// Re-export all tools as an array for convenience
import { getIssuesTool } from './get-issues';
import { getIssueTool } from './get-issue';
import { getRepoIssuesTool } from './get-repo-issues';
import { findProjectsTool } from './find-projects';

export const allTools = [
  getIssuesTool,
  getRepoIssuesTool,
  getIssueTool,
  findProjectsTool,
];
