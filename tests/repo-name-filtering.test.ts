import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findProjectIdsByRepoName, handleGetIssues } from '../src/mcp-server';
import { IssuesApi, ProjectsApi } from '../src/generated';
import { AxiosError } from 'axios';

describe('Repository Name Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findProjectIdsByRepoName', () => {
    it('should find project IDs by repository name', async () => {
      const mockProjectsResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              type: 'project',
              attributes: {
                name: 'owner/my-repo',
              },
            },
            {
              id: 'project-456',
              type: 'project',
              attributes: {
                name: 'owner/my-repo',
              },
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgProjects = vi.fn().mockResolvedValue(mockProjectsResponse);
      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);

      const projectsApi = new ProjectsApi();
      const projectIds = await findProjectIdsByRepoName(projectsApi, 'org-123', 'owner/my-repo');

      expect(mockListOrgProjects).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'org-123',
        names: ['owner/my-repo'],
      });

      expect(projectIds).toEqual(['project-123', 'project-456']);
    });

    it('should return empty array when no projects found', async () => {
      const mockEmptyResponse = {
        data: {
          data: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgProjects = vi.fn().mockResolvedValue(mockEmptyResponse);
      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);

      const projectsApi = new ProjectsApi();
      const projectIds = await findProjectIdsByRepoName(projectsApi, 'org-123', 'non-existent-repo');

      expect(projectIds).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Organization not found' },
        },
        message: 'Request failed with status code 404',
      } as AxiosError;

      const mockListOrgProjects = vi.fn().mockRejectedValue(axiosError);
      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);

      const projectsApi = new ProjectsApi();

      await expect(
        findProjectIdsByRepoName(projectsApi, 'invalid-org', 'owner/repo')
      ).rejects.toThrow();
    });
  });

  describe('handleGetIssues with repository name', () => {
    it('should resolve repository name to project ID and fetch issues', async () => {
      // Mock project lookup
      const mockProjectsResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              type: 'project',
              attributes: {
                name: 'owner/my-repo',
              },
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock issues response
      const mockIssuesResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              type: 'issue',
              attributes: {
                title: 'Test Issue',
                type: { id: 'vuln' },
                status: 'open',
                effective_severity_level: 'high',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                ignored: false,
                key: 'test-key-1',
                problems: [],
                coordinates: [],
              },
              relationships: {
                scan_item: {
                  data: {
                    id: 'project-123',
                    type: 'project',
                  },
                },
              },
            },
          ],
          links: {
            self: '/orgs/org-123/issues',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgProjects = vi.fn().mockResolvedValue(mockProjectsResponse);
      const mockListOrgIssues = vi.fn().mockResolvedValue(mockIssuesResponse);
      const mockGetOrgProject = vi.fn().mockResolvedValue({
        data: {
          data: {
            id: 'project-123',
            attributes: {
              name: 'owner/my-repo',
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);
      vi.spyOn(ProjectsApi.prototype, 'getOrgProject').mockImplementation(mockGetOrgProject);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();
      const projectsApi = new ProjectsApi();

      const result = await handleGetIssues(
        issuesApi,
        {
          orgId: 'org-123',
          orgSlug: 'my-org',
          repo: 'owner/my-repo',
          status: 'open',
        },
        projectsApi
      );

      // Verify that listOrgProjects was called to resolve the repository name
      expect(mockListOrgProjects).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'org-123',
        names: ['owner/my-repo'],
      });

      // Verify that listOrgIssues was called with the resolved project ID
      expect(mockListOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'org-123',
        status: ['open'],
        scanItemId: 'project-123',
        scanItemType: 'project',
        limit: 100,
      });

      expect(result.content[0].text).toContain('issue-1');
    });

    it('should handle UUID project IDs directly without lookup', async () => {
      const mockIssuesResponse = {
        data: {
          data: [],
          links: {
            self: '/orgs/org-123/issues',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgIssues = vi.fn().mockResolvedValue(mockIssuesResponse);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();
      const projectsApi = new ProjectsApi();

      const projectId = '12345678-1234-1234-1234-123456789012';
      
      await handleGetIssues(
        issuesApi,
        {
          orgId: 'org-123',
          orgSlug: 'my-org',
          repo: projectId,
          status: 'open',
        },
        projectsApi
      );

      // Verify that listOrgIssues was called directly with the UUID
      expect(mockListOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'org-123',
        status: ['open'],
        scanItemId: projectId,
        scanItemType: 'project',
        limit: 100,
      });
    });

    it('should return empty result when repository name has no matching projects', async () => {
      const mockProjectsResponse = {
        data: {
          data: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgProjects = vi.fn().mockResolvedValue(mockProjectsResponse);
      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);

      const issuesApi = new IssuesApi();
      const projectsApi = new ProjectsApi();

      const result = await handleGetIssues(
        issuesApi,
        {
          orgId: 'org-123',
          orgSlug: 'my-org',
          repo: 'non-existent/repo',
          status: 'open',
        },
        projectsApi
      );

      expect(mockListOrgProjects).toHaveBeenCalled();
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.total).toBe(0);
      expect(parsedResult.issues).toEqual([]);
    });

    it('should throw error when ProjectsApi is not provided for repository name filtering', async () => {
      const issuesApi = new IssuesApi();

      await expect(
        handleGetIssues(
          issuesApi,
          {
            orgId: 'org-123',
            orgSlug: 'my-org',
            repo: 'owner/repo',
            status: 'open',
          },
          undefined // No ProjectsApi provided
        )
      ).rejects.toThrow('ProjectsApi is required to filter by repository name');
    });
  });

  describe('UUID detection', () => {
    it('should correctly identify valid UUIDs', () => {
      const validUuids = [
        '12345678-1234-1234-1234-123456789012',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      validUuids.forEach((uuid) => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });
    });

    it('should correctly reject non-UUID strings', () => {
      const nonUuids = [
        'owner/repo',
        'my-repository',
        '12345',
        'not-a-uuid',
        '12345678-1234-1234-1234', // incomplete
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      nonUuids.forEach((str) => {
        expect(uuidRegex.test(str)).toBe(false);
      });
    });
  });
});
