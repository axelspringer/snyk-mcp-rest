import { z } from 'zod';
import { AxiosError } from 'axios';
import { MCPTool, ToolContext, ToolResponse } from './types';
import { formatIssue, formatIssuesResponse } from './utils';

/**
 * Input schema for get_issues tool
 */
export const getIssuesInputSchema = z.object({
  projectId: z
    .string()
    .uuid()
    .optional()
    .describe('Project ID in UUID format (e.g., "12345678-1234-1234-1234-123456789012").'),
  status: z
    .enum(['open', 'resolved', 'ignored'])
    .optional()
    .default('open')
    .describe('Issue Status Filter'),
  severity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .describe('Issue Severity Filter (optional)'),
});

/**
 * Handler for get_issues tool
 */
export async function handleGetIssues(
  args: z.infer<typeof getIssuesInputSchema>,
  context: ToolContext
): Promise<ToolResponse> {
  const { projectId, status = 'open', severity } = args;
  const { issuesApi, projectsApi } = context;
  
  // Use environment variables as defaults
  const orgId = context.orgId || process.env.SNYK_ORG_ID;
  const orgSlug = context.orgSlug || process.env.SNYK_ORG_SLUG;
  
  if (!orgId) {
    throw new Error('SNYK_ORG_ID must be set in environment variables or passed as parameter');
  }
  
  if (!orgSlug) {
    throw new Error('SNYK_ORG_SLUG must be set in environment variables or passed as parameter');
  }

  try {
    // Retrieve issues from Snyk API
    const response = await issuesApi.listOrgIssues({
      version: '2024-11-05',
      orgId,
      status: [status] as Array<'open' | 'resolved'>,
      ...(severity && { effectiveSeverityLevel: [severity] as Array<'low' | 'medium' | 'high' | 'critical'> }),
      ...(projectId && { 
        scanItemId: projectId,
        scanItemType: 'project' as any
      }),
      limit: 100,
    });

    const issues = response.data.data || [];

    // Collect unique project IDs and fetch their names
    const projectCache = new Map<string, string>();
    if (projectsApi && issues.length > 0) {
      const uniqueProjectIds = new Set(
        issues
          .map(issue => issue.relationships?.scan_item?.data?.id)
          .filter((id): id is string => !!id)
      );
      const projectIds = Array.from(uniqueProjectIds);

      await Promise.all(
        projectIds.map(async (projectId) => {
          try {
            const projectResponse = await projectsApi.getOrgProject({
              orgId,
              projectId,
              version: '2024-11-05',
            });
            const projectName = projectResponse.data.data?.attributes?.name;
            if (projectName) {
              projectCache.set(projectId, projectName);
            }
          } catch (error) {
            // If we can't fetch the project name, just use the ID
            console.error(`Failed to fetch project name for ${projectId}:`, error);
          }
        })
      );
    }

    // Format issues with web links and project names
    const formattedIssues = issues.map((issue) => {
      const projectId = issue.relationships?.scan_item?.data?.id;
      const repositoryName = projectId && projectCache.has(projectId)
        ? projectCache.get(projectId)!
        : projectId || null;
      
      return formatIssue(issue, orgSlug, repositoryName);
    });

    return formatIssuesResponse(formattedIssues, !!response.data.links?.next);
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        `Snyk API Fehler: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`
      );
    }
    throw error;
  }
}

/**
 * Get Issues tool definition
 */
export const getIssuesTool: MCPTool<typeof getIssuesInputSchema> = {
  name: 'get_issues',
  description: 'Retrieve Snyk issues for an organization and project. Requires a Project ID in UUID format.',
  inputSchema: getIssuesInputSchema,
  handler: handleGetIssues,
};
