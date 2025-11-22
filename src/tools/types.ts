import { IssuesApi, ProjectsApi } from '../generated';
import { z } from 'zod';

/**
 * MCP Tool interface
 * Each tool must implement this interface with schema and handler
 */
export interface MCPTool<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TInput;
  handler: (
    args: z.infer<TInput>,
    context: ToolContext
  ) => Promise<ToolResponse>;
}

/**
 * Tool execution context
 */
export interface ToolContext {
  issuesApi: IssuesApi;
  projectsApi: ProjectsApi;
  orgId?: string;
  orgSlug?: string;
}

/**
 * Tool response format
 */
export interface ToolResponse {
  [x: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
}
