/**
 * Shared utility functions for formatting issues and responses
 */

/**
 * Format a single issue with web link and extracted metadata
 */
export function formatIssue(issue: any, orgSlug: string, repositoryName?: string) {
  const issueId = issue.id;
  const attrs = issue.attributes;
  
  // Construct Snyk web link
  const url = `https://app.snyk.io/org/${orgSlug}/project/${issue.relationships?.scan_item?.data.id}#issue-${attrs.key}`;

  // Extract project information from scan_item relationship
  const projectId = issue.relationships?.scan_item?.data?.id || null;
  
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
    repository: repositoryName || null,
    project_id: projectId,
    locations: locations,
    dependencies: dependencies,
    problems: attrs.problems || [],
    coordinates: attrs.coordinates || [],
    url: url,
    scan_item_id: issue.relationships?.scan_item?.data.id,
  };
}

/**
 * Format issues response with metadata
 */
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
