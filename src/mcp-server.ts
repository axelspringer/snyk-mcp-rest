import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IssuesApi, ProjectsApi, Configuration } from './generated/index.js';
import { AxiosError } from 'axios';
import { z } from 'zod';

// Business Logic: Tool Schema Definition
export function getToolsSchema() {
  return {
    tools: [
      {
        name: 'get_issues',
        description: 'Retrieve Snyk issues for an organization and repository. Supports filtering by repository name or project ID.',
        inputSchema: {
          type: 'object',
          properties: {
            repo: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo") or Project ID (UUID format). If a repository name is provided, it will be resolved to matching project IDs.',
            },
            status: {
              type: 'string',
              enum: ['open', 'resolved', 'ignored'],
              description: 'Issue status filter',
              default: 'open',
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Issue severity filter (optional)',
            },
          },
          required: [],
        },
      },
    ],
  };
}

// Business Logic: Issue Formatting
export function formatIssue(issue: any, orgSlug: string, repositoryName?: string) {
  const issueId = issue.id;
  const attrs = issue.attributes;
  
  // Snyk Web-Link konstruieren
  const url = `https://app.snyk.io/org/${orgSlug}/project/${issue.relationships?.scan_item?.data.id}#issue-${attrs.key}`;

  // Extract repository information from scan_item relationship
  const repositoryId = issue.relationships?.scan_item?.data?.id || null;
  
  // Extract file locations from coordinates (for code issues) or problems
  const locations = attrs.coordinates?.[0]?.representations
    ?.filter((rep: any) => rep.sourceLocation)
    .map((rep: any) => ({
      filepath: rep.sourceLocation?.file || null,
      line: rep.sourceLocation?.region?.start?.line || null,
      column: rep.sourceLocation?.region?.start?.column || null,
    })) || [];

  // Extract dependency information from coordinates
  const dependencies = attrs.coordinates?.[0]?.representations
    ?.filter((rep: any) => rep.dependency)
    .map((rep: any) => ({
      package_name: rep.dependency?.package_name || null,
      package_version: rep.dependency?.package_version || null,
    })) || [];

  return {
    id: issueId,
    title: attrs.title,
    effective_severity_level: attrs.effective_severity_level,
    status: attrs.status,
    type: attrs.type,
    created_at: attrs.created_at,
    updated_at: attrs.updated_at,
    ignored: attrs.ignored,
    key: attrs.key,
    repository: repositoryName || repositoryId,
    repository_id: repositoryId,
    locations: locations,
    dependencies: dependencies,
    problems: attrs.problems || [],
    coordinates: attrs.coordinates || [],
    url: url,
    scan_item_id: issue.relationships?.scan_item?.data.id,
  };
}

// Business Logic: Response Formatting
export function formatIssuesResponse(issues: any[], hasMore: boolean) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            total: issues.length,
            count: issues.length,
            issues,
            has_more: hasMore,
          },
          null,
          2
        ),
      },
    ],
  };
}

// Business Logic: Map Repository Name to Project IDs
export async function findProjectIdsByRepoName(
  projectsApi: ProjectsApi,
  orgId: string,
  repoName: string
): Promise<string[]> {
  try {
    const response = await projectsApi.listOrgProjects({
      version: '2024-11-05',
      orgId,
      names: [repoName],
    });

    const projects = response.data.data || [];
    return projects.map(project => project.id).filter((id): id is string => !!id);
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        `Failed to find projects by name "${repoName}": ${error.response?.status} - ${JSON.stringify(error.response?.data)}`
      );
    }
    throw error;
  }
}

// Business Logic: Get Issues Handler
export async function handleGetIssues(
  issuesApi: IssuesApi,
  params: {
    orgId?: string;
    orgSlug?: string;
    repo?: string;
    status?: string;
    severity?: string;
  },
  projectsApi?: ProjectsApi
) {
  const { repo, status = 'open', severity } = params;
  
  // Use environment variables as defaults
  const orgId = params.orgId || process.env.SNYK_ORG_ID;
  const orgSlug = params.orgSlug || process.env.SNYK_ORG_SLUG;
  
  if (!orgId) {
    throw new Error('SNYK_ORG_ID must be set in environment variables or passed as parameter');
  }
  
  if (!orgSlug) {
    throw new Error('SNYK_ORG_SLUG must be set in environment variables or passed as parameter');
  }

  try {
    // If repo is provided and it's not a UUID (i.e., it's a repository name), resolve to project IDs
    let scanItemIds: string[] | undefined;
    if (repo) {
      // Check if repo looks like a UUID (project ID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(repo);
      
      if (isUuid) {
        // It's already a project ID
        scanItemIds = [repo];
      } else if (projectsApi) {
        // It's a repository name - resolve to project IDs
        scanItemIds = await findProjectIdsByRepoName(projectsApi, orgId, repo);
        
        if (scanItemIds.length === 0) {
          // No projects found with this name - return empty result
          return formatIssuesResponse([], false);
        }
      } else {
        throw new Error('ProjectsApi is required to filter by repository name');
      }
    }

    // Issues von Snyk API abrufen
    const response = await issuesApi.listOrgIssues({
      version: '2024-11-05',
      orgId,
      status: [status] as Array<'open' | 'resolved'>,
      ...(severity && { effectiveSeverityLevel: [severity] as Array<'low' | 'medium' | 'high' | 'critical'> }),
      ...(scanItemIds && scanItemIds.length > 0 && { 
        scanItemId: scanItemIds[0], // Use first project ID for now (API limitation)
        scanItemType: 'project' as any
      }),
      limit: 100,
    });

    const issues = response.data.data || [];

    // Collect unique project IDs and fetch their names
    const projectCache = new Map<string, string>();
    if (projectsApi && issues.length > 0) {
      const projectIds = [...new Set(
        issues
          .map(issue => issue.relationships?.scan_item?.data?.id)
          .filter((id): id is string => !!id)
      )];

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

    // Issues formatieren mit Web-Links und Project Names
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

// Business Logic: List Tools Handler
export async function handleListTools() {
  return getToolsSchema();
}

// Business Logic: Call Tool Handler
export async function handleCallTool(
  issuesApi: IssuesApi,
  request: {
    params: {
      name: string;
      arguments?: any;
    };
  },
  projectsApi?: ProjectsApi
) {
  if (request.params.name !== 'get_issues') {
    throw new Error(`Unbekanntes Tool: ${request.params.name}`);
  }

  const params = request.params.arguments as {
    repo?: string;
    status?: string;
    severity?: string;
  };

  return handleGetIssues(issuesApi, params, projectsApi);
}

export function createMCPServer(apiKey?: string) {
  // Snyk API Configuration
  const config = new Configuration({
    apiKey: apiKey || process.env.SNYK_API_KEY,
    basePath: 'https://api.snyk.io/rest',
  });

  const issuesApi = new IssuesApi(config);
  const projectsApi = new ProjectsApi(config);

  // Create MCP Server using high-level API
  const server = new McpServer(
    {
      name: 'snyk-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define input schema for get_issues tool
  const getIssuesInputSchema = z.object({
    repo: z.string().optional().describe('Repository name (e.g., "owner/repo") or Project ID (UUID). Repository names are automatically resolved to project IDs.'),
    status: z.enum(['open', 'resolved', 'ignored']).optional().default('open').describe('Issue Status Filter'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Issue Severity Filter (optional)'),
  });

  // Register the get_issues tool using the new API
  server.registerTool(
    'get_issues',
    {
      description: 'Retrieve Snyk issues for an organization and repository. Supports filtering by repository name or project ID.',
      inputSchema: getIssuesInputSchema,
    },
    async (args) => {
      try {
        const params = {
          repo: args.repo,
          status: args.status || 'open',
          severity: args.severity,
        };
        const result = await handleGetIssues(issuesApi, params, projectsApi);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Unknown error occurred');
      }
    }
  );

  return server;
}
