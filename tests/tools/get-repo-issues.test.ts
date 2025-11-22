import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssuesApi, ProjectsApi, Configuration } from '../../src/generated/index.js';
import { AxiosError } from 'axios';
import { handleGetRepoIssues, getRepoIssuesTool } from '../../src/tools/get-repo-issues';

describe('Get Repo Issues Tool', () => {
  let mockIssuesApi: IssuesApi;
  let mockProjectsApi: ProjectsApi;
  const originalEnv = process.env;

  beforeEach(() => {
    const config = new Configuration({ apiKey: 'test-key' });
    mockIssuesApi = new IssuesApi(config);
    mockProjectsApi = new ProjectsApi(config);
    process.env = { ...originalEnv, SNYK_ORG_ID: 'org-123', SNYK_ORG_SLUG: 'my-org' };
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(getRepoIssuesTool.name).toBe('get_repo_issues');
    });

    it('should have description', () => {
      expect(getRepoIssuesTool.description).toContain('repository name');
    });
  });

  describe('handleGetRepoIssues', () => {
    it('should find projects and aggregate issues', async () => {
      const mockProjectsResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              attributes: { name: 'github.com/user/my-repo:package.json' },
            },
            {
              id: 'project-456',
              attributes: { name: 'github.com/user/my-repo:Dockerfile' },
            },
          ],
        },
      };

      const mockIssuesResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              attributes: {
                title: 'Test Issue',
                effective_severity_level: 'high',
                status: 'open',
                type: 'vuln',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                ignored: false,
                key: 'KEY-1',
              },
              relationships: {
                scan_item: { data: { id: 'project-123' } },
              },
            },
          ],
        },
      };

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockResolvedValue(mockProjectsResponse as any);
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockIssuesResponse as any);

      const result = await handleGetRepoIssues({
        repositoryName: 'my-repo',
      } as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.matching_projects).toBe(2);
      expect(parsed.repositoryName).toBe('my-repo');
    });

    it('should handle no matching projects', async () => {
      const mockProjectsResponse = {
        data: { data: [] },
      };

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockResolvedValue(mockProjectsResponse as any);

      const result = await handleGetRepoIssues({
        repositoryName: 'nonexistent',
      } as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.matching_projects).toBe(0);
      expect(parsed.issues).toEqual([]);
    });

    it('should filter by severity', async () => {
      const mockProjectsResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              attributes: { name: 'github.com/user/repo:package.json' },
            },
          ],
        },
      };

      const mockIssuesResponse = {
        data: { data: [] },
      };

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockResolvedValue(mockProjectsResponse as any);
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockIssuesResponse as any);

      await handleGetRepoIssues({
        repositoryName: 'repo',
        severity: 'critical',
      } as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveSeverityLevel: ['critical'],
        })
      );
    });

    it('should handle API errors', async () => {
      const axiosError = new AxiosError(
        'Unauthorized',
        '401',
        undefined,
        {},
        {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Unauthorized' },
          headers: {},
          config: {} as any,
        }
      );

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockRejectedValue(axiosError);

      await expect(
        handleGetRepoIssues({
          repositoryName: 'repo',
        } as any, {
          issuesApi: mockIssuesApi,
          projectsApi: mockProjectsApi,
        })
      ).rejects.toThrow('Snyk API Error: 401');
    });
  });
});
