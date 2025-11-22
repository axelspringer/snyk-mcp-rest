import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssuesApi, ProjectsApi, Configuration } from '../../src/generated/index.js';
import { AxiosError } from 'axios';
import { handleGetIssues, getIssuesTool, getIssuesInputSchema } from '../../src/tools/get-issues';

describe('Get Issues Tool', () => {
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
      expect(getIssuesTool.name).toBe('get_issues');
    });

    it('should have description', () => {
      expect(getIssuesTool.description).toContain('Snyk issues');
    });

    it('should have valid input schema', () => {
      expect(getIssuesTool.inputSchema).toBeDefined();
      expect(getIssuesTool.inputSchema.shape).toHaveProperty('projectId');
      expect(getIssuesTool.inputSchema.shape).toHaveProperty('status');
      expect(getIssuesTool.inputSchema.shape).toHaveProperty('severity');
    });

    it('should validate UUID format for projectId', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const invalidUuid = 'not-a-uuid';

      const validResult = getIssuesInputSchema.safeParse({ projectId: validUuid });
      expect(validResult.success).toBe(true);

      const invalidResult = getIssuesInputSchema.safeParse({ projectId: invalidUuid });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('handleGetIssues', () => {
    it('should retrieve and format issues successfully using environment variables', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              attributes: {
                title: 'Vulnerability 1',
                effective_severity_level: 'high',
                status: 'open',
                type: 'vuln',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                ignored: false,
                key: 'KEY-1',
              },
              relationships: {
                scan_item: { data: { id: 'project-1' } },
              },
            },
          ],
          links: { next: undefined },
        },
      };

      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      const result = await handleGetIssues({} as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'org-123',
        status: ['open'],
        limit: 100,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.issues[0].id).toBe('issue-1');
      expect(parsed.issues[0].url).toContain('my-org');
    });

    it('should filter by status', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      await handleGetIssues({
        status: 'resolved',
      }, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['resolved'],
        })
      );
    });

    it('should filter by severity', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      await handleGetIssues({
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

    it('should filter by project ID', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      const projectId = '12345678-1234-1234-1234-123456789012';
      
      await handleGetIssues({
        projectId: projectId,
      } as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          scanItemId: projectId,
          scanItemType: 'project',
        })
      );
    });

    it('should use default status "open" when not specified', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      await handleGetIssues({} as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['open'],
        })
      );
    });

    it('should throw error when SNYK_ORG_ID is missing', async () => {
      process.env = { ...originalEnv };
      delete process.env.SNYK_ORG_ID;

      await expect(
        handleGetIssues({} as any, {
          issuesApi: mockIssuesApi,
          projectsApi: mockProjectsApi,
        })
      ).rejects.toThrow('SNYK_ORG_ID must be set in environment variables or passed as parameter');
    });

    it('should throw error when SNYK_ORG_SLUG is missing', async () => {
      process.env = { ...originalEnv, SNYK_ORG_ID: 'org-123' };
      delete process.env.SNYK_ORG_SLUG;

      await expect(
        handleGetIssues({} as any, {
          issuesApi: mockIssuesApi,
          projectsApi: mockProjectsApi,
        })
      ).rejects.toThrow('SNYK_ORG_SLUG must be set in environment variables or passed as parameter');
    });

    it('should indicate has_more when next link exists', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              attributes: {
                title: 'Test',
                effective_severity_level: 'low',
                status: 'open',
                type: 'vuln',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                ignored: false,
                key: 'KEY',
              },
              relationships: {
                scan_item: { data: { id: 'project-1' } },
              },
            },
          ],
          links: { next: 'https://api.snyk.io/next-page' },
        },
      };

      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      const result = await handleGetIssues({} as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
        orgId: 'org-123',
        orgSlug: 'my-org',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.has_more).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
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

      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockRejectedValue(axiosError);

      await expect(
        handleGetIssues({} as any, {
          issuesApi: mockIssuesApi,
          projectsApi: mockProjectsApi,
          orgId: 'org-123',
          orgSlug: 'my-org',
        })
      ).rejects.toThrow('Snyk API Fehler: 401');
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        data: {
          data: [],
          links: {},
        },
      };

      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      const result = await handleGetIssues({} as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
        orgId: 'org-123',
        orgSlug: 'my-org',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.issues).toEqual([]);
    });

    it('should fetch and cache project names', async () => {
      const mockIssuesResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              attributes: {
                title: 'Test',
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
          links: {},
        },
      };

      const mockProjectResponse = {
        data: {
          data: {
            id: 'project-123',
            attributes: {
              name: 'github.com/user/repo:package.json',
            },
          },
        },
      };

      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockIssuesResponse as any);
      vi.spyOn(mockProjectsApi, 'getOrgProject').mockResolvedValue(mockProjectResponse as any);

      const result = await handleGetIssues({} as any, {
        issuesApi: mockIssuesApi,
        projectsApi: mockProjectsApi,
        orgId: 'org-123',
        orgSlug: 'my-org',
      });

      expect(mockProjectsApi.getOrgProject).toHaveBeenCalledWith({
        orgId: 'org-123',
        projectId: 'project-123',
        version: '2024-11-05',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issues[0].repository).toBe('github.com/user/repo:package.json');
    });
  });
});
