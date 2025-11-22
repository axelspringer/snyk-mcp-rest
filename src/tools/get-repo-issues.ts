import { z } from 'zod';
import { AxiosError } from 'axios';
import { MCPTool, ToolContext, ToolResponse } from './types';
import { formatIssue } from './utils';

/**
 * Input schema for get_repo_issues tool
 */
export const getRepoIssuesInputSchema = z.object({
  repositoryName: z
    .string()
    .describe('Repository name or prefix to search for (e.g., "spring-media/apps-android-news" or "myRepo").'),
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
 * Handler for get_repo_issues tool
 */
export async function handleGetRepoIssues(
  args: z.infer<typeof getRepoIssuesInputSchema>,
  context: ToolContext
): Promise<ToolResponse> {
  const { repositoryName, status = 'open', severity } = args;
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
    // Find all projects matching the repository name
    const response = await projectsApi.listOrgProjects({
      version: '2024-11-05',
      orgId,
      limit: 100,
    });

    const projects = response.data.data || [];
    
    // Filter projects by repository name (case-insensitive substring match)
    const query = repositoryName.toLowerCase();
    const matchingProjects = projects.filter((project) => {
      const projectName = project.attributes?.name || '';
      return projectName.toLowerCase().includes(query);
    });

    if (matchingProjects.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                total: 0,
                count: 0,
                repositoryName: repositoryName,
                matching_projects: 0,
                issues: [],
                has_more: false,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Collect issues from all matching projects
    const allIssues: any[] = [];
    const projectNames = new Map<string, string>();

    for (const project of matchingProjects) {
      const projectId = project.id;
      const projectName = project.attributes?.name || '';
      projectNames.set(projectId, projectName);

      try {
        const issuesResponse = await issuesApi.listOrgIssues({
          version: '2024-11-05',
          orgId,
          status: [status] as Array<'open' | 'resolved'>,
          ...(severity && { 
            effectiveSeverityLevel: [severity] as Array<'low' | 'medium' | 'high' | 'critical'> 
          }),
          scanItemId: projectId,
          scanItemType: 'project' as any,
          limit: 100,
        });

        const issues = issuesResponse.data.data || [];
        
        // Format issues with project names
        const formattedIssues = issues.map((issue) => 
          formatIssue(issue, orgSlug, projectName)
        );

        allIssues.push(...formattedIssues);
      } catch (error) {
        // Continue with other projects if one fails
        console.error(`Failed to fetch issues for project ${projectId}:`, error);
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              total: allIssues.length,
              count: allIssues.length,
              repositoryName: repositoryName,
              matching_projects: matchingProjects.length,
              projects: matchingProjects.map(p => ({
                projectId: p.id,
                projectName: p.attributes?.name || '',
              })),
              issues: allIssues,
              has_more: false,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        `Snyk API Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`
      );
    }
    throw error;
  }
}

/**
 * Get Repo Issues tool definition
 */
export const getRepoIssuesTool: MCPTool<typeof getRepoIssuesInputSchema> = {
  name: 'get_repo_issues',
  description: 'Retrieve all Snyk issues for projects matching a repository name. Searches for projects by name prefix and aggregates issues from all matching projects.',
  inputSchema: getRepoIssuesInputSchema,
  handler: handleGetRepoIssues,
};
