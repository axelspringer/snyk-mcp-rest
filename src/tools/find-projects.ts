import { z } from 'zod';
import { AxiosError } from 'axios';
import { MCPTool, ToolContext, ToolResponse } from './types';

/**
 * Input schema for find_projects tool
 */
export const findProjectsInputSchema = z.object({
  query: z
    .string()
    .describe('Search query string to match against project names (e.g., repository name, file name, or any substring of the project name).'),
});

/**
 * Handler for find_projects tool
 */
export async function handleFindProjects(
  args: z.infer<typeof findProjectsInputSchema>,
  context: ToolContext
): Promise<ToolResponse> {
  const { query } = args;
  const { projectsApi } = context;
  
  // Use environment variables as defaults
  const orgId = context.orgId || process.env.SNYK_ORG_ID;
  
  if (!orgId) {
    throw new Error('SNYK_ORG_ID must be set in environment variables or passed as parameter');
  }

  try {
    // Fetch all projects from the organization
    const response = await projectsApi.listOrgProjects({
      version: '2024-11-05',
      orgId,
      limit: 100,
    });

    const projects = response.data.data || [];
    
    // Filter projects by query string (case-insensitive substring match)
    const searchQuery = query.toLowerCase();
    const matchingProjects = projects
      .filter((project) => {
        const projectName = project.attributes?.name || '';
        return projectName.toLowerCase().includes(searchQuery);
      })
      .map((project) => ({
        projectId: project.id,
        projectName: project.attributes?.name || '',
      }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              total: matchingProjects.length,
              query: query,
              projects: matchingProjects,
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
 * Find Projects tool definition
 */
export const findProjectsTool: MCPTool<typeof findProjectsInputSchema> = {
  name: 'find_projects',
  description: 'Search for Snyk projects by name. Returns a list of projects where the project name contains the provided query string (case-insensitive substring match).',
  inputSchema: findProjectsInputSchema,
  handler: handleFindProjects,
};
