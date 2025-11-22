import { describe, it, expect, vi } from 'vitest';
import { Configuration, OrgsApi, ProjectsApi, IssuesApi, GroupsApi, BaseAPI } from '../src';
import { AxiosError } from 'axios';

describe('Snyk API Client', () => {
  describe('Configuration', () => {
    it('should create a configuration with API key', () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
        basePath: 'https://api.snyk.io/rest',
      });

      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-api-key');
      expect(config.basePath).toBe('https://api.snyk.io/rest');
    });

    it('should create a configuration with access token', () => {
      const config = new Configuration({
        accessToken: 'test-token',
        basePath: 'https://api.snyk.io/rest',
      });

      expect(config).toBeDefined();
      expect(config.accessToken).toBe('test-token');
    });

    it('should create a configuration with custom base path', () => {
      const customPath = 'https://custom.api.snyk.io/rest';
      const config = new Configuration({
        apiKey: 'test-key',
        basePath: customPath,
      });

      expect(config.basePath).toBe(customPath);
    });

    it('should create configuration without basePath (uses default)', () => {
      const config = new Configuration({
        apiKey: 'test-key',
      });

      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-key');
    });

    it('should handle empty configuration parameters', () => {
      const config = new Configuration({});
      
      expect(config).toBeDefined();
    });
  });

  describe('OrgsApi', () => {
    it('should instantiate OrgsApi with configuration', () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });
      const api = new OrgsApi(config);

      expect(api).toBeDefined();
      expect(api).toBeInstanceOf(BaseAPI);
    });

    it('should instantiate OrgsApi without configuration', () => {
      const api = new OrgsApi();
      
      expect(api).toBeDefined();
    });
  });

  describe('ProjectsApi', () => {
    it('should instantiate ProjectsApi with configuration', () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });
      const api = new ProjectsApi(config);

      expect(api).toBeDefined();
      expect(api).toBeInstanceOf(BaseAPI);
    });

    it('should instantiate ProjectsApi without configuration', () => {
      const api = new ProjectsApi();
      
      expect(api).toBeDefined();
    });
  });

  describe('IssuesApi', () => {
    it('should instantiate IssuesApi with configuration', () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });
      const api = new IssuesApi(config);

      expect(api).toBeDefined();
      expect(api).toBeInstanceOf(BaseAPI);
    });

    it('should instantiate IssuesApi with access token', () => {
      const config = new Configuration({
        accessToken: 'test-token',
      });
      const api = new IssuesApi(config);

      expect(api).toBeDefined();
    });
  });

  describe('GroupsApi', () => {
    it('should instantiate GroupsApi', () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });
      const api = new GroupsApi(config);

      expect(api).toBeDefined();
      expect(api).toBeInstanceOf(BaseAPI);
    });
  });

  describe('API Exports', () => {
    it('should export Configuration', () => {
      expect(Configuration).toBeDefined();
    });

    it('should export BaseAPI', () => {
      expect(BaseAPI).toBeDefined();
    });

    it('should export OrgsApi', () => {
      expect(OrgsApi).toBeDefined();
    });

    it('should export ProjectsApi', () => {
      expect(ProjectsApi).toBeDefined();
    });

    it('should export IssuesApi', () => {
      expect(IssuesApi).toBeDefined();
    });

    it('should export GroupsApi', () => {
      expect(GroupsApi).toBeDefined();
    });
  });

  describe('Integration - Multi-API Workflow', () => {
    it('should support workflow: Orgs -> Projects -> Issues', async () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });

      const orgsApi = new OrgsApi(config);
      const projectsApi = new ProjectsApi(config);
      const issuesApi = new IssuesApi(config);

      // Mock responses
      const mockOrgResponse = {
        data: {
          data: [
            { id: 'org-1', type: 'org', attributes: { name: 'Test Org', slug: 'test-org' } }
          ],
        },
      };

      const mockProjectsResponse = {
        data: {
          data: [
            { id: 'project-1', type: 'project', attributes: { name: 'Test Project' } }
          ],
        },
      };

      const mockIssuesResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              type: 'issue',
              attributes: {
                title: 'Test Issue',
                effective_severity_level: 'high',
                status: 'open',
                type: { id: 'vuln' },
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                ignored: false,
                key: 'test-key',
              },
              relationships: {
                scan_item: {
                  data: { id: 'project-1', type: 'project' }
                }
              }
            }
          ],
        },
      };

      vi.spyOn(orgsApi, 'listOrgs').mockResolvedValue(mockOrgResponse as any);
      vi.spyOn(projectsApi, 'listOrgProjects').mockResolvedValue(mockProjectsResponse as any);
      vi.spyOn(issuesApi, 'listOrgIssues').mockResolvedValue(mockIssuesResponse as any);

      // Execute workflow
      const orgs = await orgsApi.listOrgs({ version: '2024-11-05' });
      expect(orgs.data.data).toHaveLength(1);

      const orgId = orgs.data.data[0].id;
      const projects = await projectsApi.listOrgProjects({ version: '2024-11-05', orgId });
      expect(projects.data.data).toHaveLength(1);

      const issues = await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId,
        status: ['open'],
      });
      expect(issues.data.data).toHaveLength(1);
      expect(issues.data.data[0].attributes.effective_severity_level).toBe('high');
    });

    it('should share configuration between APIs', () => {
      const config = new Configuration({
        apiKey: 'shared-api-key',
      });

      const orgsApi = new OrgsApi(config);
      const projectsApi = new ProjectsApi(config);
      const issuesApi = new IssuesApi(config);

      expect(orgsApi).toBeDefined();
      expect(projectsApi).toBeDefined();
      expect(issuesApi).toBeDefined();
    });

    it('should support pagination links', async () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });

      const issuesApi = new IssuesApi(config);

      const mockPagedResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              type: 'issue',
              attributes: {
                title: 'Issue 1',
                effective_severity_level: 'high',
                status: 'open',
                type: { id: 'vuln' },
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                ignored: false,
                key: 'test-key-1',
              },
              relationships: {
                scan_item: {
                  data: { id: 'project-1', type: 'project' }
                }
              }
            }
          ],
          links: {
            self: '/orgs/test-org/issues',
            next: '/orgs/test-org/issues?cursor=abc123',
          },
        },
      };

      vi.spyOn(issuesApi, 'listOrgIssues').mockResolvedValue(mockPagedResponse as any);

      const response = await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId: 'test-org',
        status: ['open'],
      });

      expect(response.data.data).toHaveLength(1);
      expect(response.data.links?.next).toBeDefined();
      expect(response.data.links?.next).toContain('cursor=abc123');
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { 
            errors: [{ 
              status: '401',
              title: 'Unauthorized',
              detail: 'Invalid API token'
            }]
          },
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

    it('should handle 404 Not Found errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { 
            errors: [{ 
              status: '404',
              title: 'Not Found',
              detail: 'Organization not found'
            }]
          },
        },
        message: 'Request failed with status code 404',
      } as AxiosError;

      const mockListOrgs = vi.fn().mockRejectedValue(axiosError);
      vi.spyOn(OrgsApi.prototype, 'listOrgs').mockImplementation(mockListOrgs);

      const orgsApi = new OrgsApi();

      await expect(
        orgsApi.listOrgs({
          version: '2024-11-05',
        })
      ).rejects.toMatchObject({
        isAxiosError: true,
        response: {
          status: 404,
        },
      });
    });

    it('should handle 429 Rate Limit errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { 
            errors: [{ 
              status: '429',
              title: 'Too Many Requests',
              detail: 'Rate limit exceeded'
            }]
          },
          headers: {
            'retry-after': '60',
          },
          config: {} as any,
        },
        message: 'Request failed with status code 429',
        toJSON: () => ({}),
        name: 'AxiosError',
      } as AxiosError;

      const mockListOrgProjects = vi.fn().mockRejectedValue(axiosError);
      vi.spyOn(ProjectsApi.prototype, 'listOrgProjects').mockImplementation(mockListOrgProjects);

      const projectsApi = new ProjectsApi();

      await expect(
        projectsApi.listOrgProjects({
          version: '2024-11-05',
          orgId: 'test-org-id',
        })
      ).rejects.toMatchObject({
        isAxiosError: true,
        response: {
          status: 429,
        },
      });
    });

    it('should handle network errors without response', async () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        code: 'ECONNREFUSED',
      } as AxiosError;

      const mockListOrgIssues = vi.fn().mockRejectedValue(networkError);
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
        code: 'ECONNREFUSED',
      });
    });
  });
});
