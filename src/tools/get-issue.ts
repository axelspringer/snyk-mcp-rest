import { z } from 'zod';
import { AxiosError } from 'axios';
import { MCPTool, ToolContext, ToolResponse } from './types';

/**
 * Input schema for get_issue tool
 */
export const getIssueInputSchema = z.object({
  issue_id: z
    .string()
    .uuid()
    .describe("The unique identifier (UUID) of the issue to retrieve. Must be in UUID format, not an issue key."),
});

/**
 * Handler for get_issue tool
 */
export async function handleGetIssue(
  args: z.infer<typeof getIssueInputSchema>,
  context: ToolContext
): Promise<ToolResponse> {
  const { issue_id } = args;
  const { issuesApi } = context;
  
  // Use environment variables as defaults
  const orgId = context.orgId || process.env.SNYK_ORG_ID;
  const orgSlug = context.orgSlug || process.env.SNYK_ORG_SLUG;
  
  console.error(`[handleGetIssue] orgId: ${orgId}, orgSlug: ${orgSlug}, issue_id: ${issue_id}`);
  
  if (!orgId) {
    throw new Error('SNYK_ORG_ID must be set in environment variables or passed as parameter');
  }
  
  if (!orgSlug) {
    throw new Error('SNYK_ORG_SLUG must be set in environment variables or passed as parameter');
  }

  try {
    console.error(`[handleGetIssue] Calling Snyk API: getOrgIssueByIssueID`);
    
    // Get detailed issue information
    const response = await issuesApi.getOrgIssueByIssueID({
      version: '2024-11-05',
      orgId,
      issueId: issue_id,
    });

    console.error(`[handleGetIssue] API response received, status: ${response.status}`);

    const issue = response.data.data;
    const attrs = issue?.attributes;
    
    if (!issue || !attrs) {
      throw new Error(`Issue ${issue_id} not found`);
    }

    // Extract remediation and fix information from coordinates
    const remedies = attrs.coordinates?.flatMap((coord: any) => 
      coord.remedies?.map((remedy: any) => ({
        type: remedy.type,
        description: remedy.description,
        details: remedy.details,
      })) || []
    ) || [];

    // Extract upgrade recommendations
    const upgrades = attrs.coordinates?.flatMap((coord: any) =>
      coord.representations?.filter((rep: any) => rep.dependency).map((rep: any) => ({
        package_name: rep.dependency?.package_name,
        current_version: rep.dependency?.package_version,
        recommended_version: rep.dependency?.fixed_in?.[0] || null,
      })) || []
    ) || [];

    // Construct Snyk web URL
    const scanItemId = issue.relationships?.scan_item?.data?.id;
    const url = scanItemId 
      ? `https://app.snyk.io/org/${orgSlug}/project/${scanItemId}#issue-${attrs.key}`
      : null;

    const detailedIssue = {
      id: issue.id,
      title: attrs.title,
      description: attrs.problems?.[0]?.disclosed_at ? `Disclosed: ${attrs.problems[0].disclosed_at}` : null,
      effective_severity_level: attrs.effective_severity_level,
      status: attrs.status,
      type: attrs.type,
      created_at: attrs.created_at,
      updated_at: attrs.updated_at,
      key: attrs.key,
      url,
      
      // Vulnerability details
      problems: attrs.problems || [],
      coordinates: attrs.coordinates || [],
      
      // Fix information
      remedies,
      upgrades,
      
      // References and additional info
      classes: attrs.classes || [],
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(detailedIssue, null, 2),
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
 * Get Issue tool definition
 */
export const getIssueTool: MCPTool<typeof getIssueInputSchema> = {
  name: 'get_issue',
  description: 'Retrieve detailed information about a specific Snyk issue by its UUID. Note: This requires the issue UUID (e.g., "4a18d42f-0706-4ad0-b127-24078731fbed"), NOT the issue key (e.g., "SNYK-JAVA-...").',
  inputSchema: getIssueInputSchema,
  handler: handleGetIssue,
};
