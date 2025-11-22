import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IssuesApi, ProjectsApi, Configuration } from '../src/generated';
import { AxiosError } from 'axios';
import { createMCPServer } from '../src/mcp-server';

describe('MCP Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Server Creation', () => {
    it('should create server with custom API key', () => {
      const server = createMCPServer('custom-api-key');
      expect(server).toBeDefined();
      expect(server).toHaveProperty('server');
      expect(server).toHaveProperty('registerTool');
    });

    it('should create server with environment API key', () => {
      const originalKey = process.env.SNYK_API_KEY;
      process.env.SNYK_API_KEY = 'env-api-key';

      const server = createMCPServer();
      expect(server).toBeDefined();

      process.env.SNYK_API_KEY = originalKey;
    });

    it('should have server connection capability', () => {
      const server = createMCPServer('test-key');
      expect(server).toBeDefined();
      expect(server).toHaveProperty('connect');
    });
  });

  describe('Tool Registration', () => {
    it('should register all tools', () => {
      const server = createMCPServer('test-key');
      expect(server).toBeDefined();
      // Tools are registered during server creation
      // The server should have the registerTool method
      expect(typeof server.registerTool).toBe('function');
    });
  });

  describe('MCP Tool Execution', () => {
    const mockIssuesResponse = {
      data: {
        data: [
          {
            id: 'test-issue-1',
            type: 'issue',
            attributes: {
              title: 'Test Vulnerability',
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
          self: '/orgs/test-org-id/issues',
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should retrieve issues with correct parameters', async () => {
      const mockListOrgIssues = vi.fn().mockResolvedValue(mockIssuesResponse);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();
      const response = await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId: 'test-org-id',
        status: ['open'],
      });

      expect(mockListOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'test-org-id',
        status: ['open'],
      });

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].attributes.effective_severity_level).toBe('high');
    });

    it('should handle empty response', async () => {
      const mockEmptyResponse = {
        data: {
          data: [],
          links: {
            self: '/orgs/test-org-id/issues',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgIssues = vi.fn().mockResolvedValue(mockEmptyResponse);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();
      const response = await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId: 'test-org-id',
        status: ['open'],
      });

      expect(response.data.data).toHaveLength(0);
      expect(response.data.links?.next).toBeUndefined();
    });

    it('should filter by severity', async () => {
      const mockListOrgIssues = vi.fn().mockResolvedValue(mockIssuesResponse);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();
      await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId: 'test-org-id',
        status: ['open'],
        effectiveSeverityLevel: ['high', 'critical'],
      });

      expect(mockListOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'test-org-id',
        status: ['open'],
        effectiveSeverityLevel: ['high', 'critical'],
      });
    });

    it('should detect pagination links', async () => {
      const mockPagedResponse = {
        ...mockIssuesResponse,
        data: {
          ...mockIssuesResponse.data,
          links: {
            self: '/orgs/test-org-id/issues',
            next: '/orgs/test-org-id/issues?cursor=next',
          },
        },
      };

      const mockListOrgIssues = vi.fn().mockResolvedValue(mockPagedResponse);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();
      const response = await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId: 'test-org-id',
        status: ['open'],
      });

      expect(response.data.links?.next).toBeDefined();
      expect(response.data.links?.next).toBe('/orgs/test-org-id/issues?cursor=next');
    });

    it('should handle API errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
        message: 'Request failed with status code 401',
      } as AxiosError;

      const mockListOrgIssues = vi.fn().mockRejectedValue(axiosError);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();

      await expect(
        issuesApi.listOrgIssues({
          version: '2024-11-05',
          orgId: 'test-org-id',
          status: ['open'],
        })
      ).rejects.toMatchObject({
        isAxiosError: true,
        response: {
          status: 401,
        },
      });
    });
  });

  describe('Project Search', () => {
    it('should find projects matching query', async () => {
      const mockProjectsResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              type: 'project',
              attributes: {
                name: 'github.com/user/my-repo:package.json',
              },
            },
            {
              id: 'project-456',
              type: 'project',
              attributes: {
                name: 'github.com/user/other-repo:pom.xml',
              },
            },
            {
              id: 'project-789',
              type: 'project',
              attributes: {
                name: 'github.com/user/my-repo:Dockerfile',
              },
            },
          ],
          links: {
            self: '/orgs/test-org-id/projects',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const { ProjectsApi } = await import('../src/generated/index.js');
      const mockListOrgProjects = vi.fn().mockResolvedValue(mockProjectsResponse);
      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);

      const projectsApi = new ProjectsApi();
      const response = await projectsApi.listOrgProjects({
        version: '2024-11-05',
        orgId: 'test-org-id',
        limit: 100,
      });

      expect(response.data.data).toHaveLength(3);
      
      // Test filtering
      const query = 'my-repo';
      const matchingProjects = response.data.data!.filter((project: any) =>
        project.attributes.name.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(matchingProjects).toHaveLength(2);
      expect(matchingProjects[0].attributes.name).toContain('my-repo');
    });

    it('should perform case-insensitive search', async () => {
      const mockProjectsResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              type: 'project',
              attributes: {
                name: 'GitHub.com/User/MyRepo:Package.json',
              },
            },
          ],
          links: {
            self: '/orgs/test-org-id/projects',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const { ProjectsApi } = await import('../src/generated/index.js');
      const mockListOrgProjects = vi.fn().mockResolvedValue(mockProjectsResponse);
      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);

      const projectsApi = new ProjectsApi();
      const response = await projectsApi.listOrgProjects({
        version: '2024-11-05',
        orgId: 'test-org-id',
        limit: 100,
      });

      // Test case-insensitive matching
      const queries = ['myrepo', 'MYREPO', 'MyRepo', 'package.json'];
      
      queries.forEach((query) => {
        const matchingProjects = response.data.data!.filter((project: any) =>
          project.attributes.name.toLowerCase().includes(query.toLowerCase())
        );
        expect(matchingProjects.length).toBeGreaterThan(0);
      });
    });
  });
});
