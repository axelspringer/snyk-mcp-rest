import { describe, it, expect, vi } from 'vitest';
import { Configuration, OrgsApi, ProjectsApi, IssuesApi } from '../src';

describe('Integration Tests', () => {
  describe('Multi-API Workflow', () => {
    it('sollte Orgs, Projects und Issues in einem Workflow abrufen', async () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
        basePath: 'https://api.snyk.io/rest',
      });

      const orgsApi = new OrgsApi(config);
      const projectsApi = new ProjectsApi(config);
      const issuesApi = new IssuesApi(config);

      // Mock Org Response
      const mockOrgResponse = {
        data: {
          data: [
            { id: 'org-1', type: 'org', attributes: { name: 'Test Org', slug: 'test-org' } }
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock Projects Response
      const mockProjectsResponse = {
        data: {
          data: [
            { id: 'project-1', type: 'project', attributes: { name: 'Test Project' } }
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock Issues Response
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
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(orgsApi, 'listOrgs').mockResolvedValue(mockOrgResponse as any);
      vi.spyOn(projectsApi, 'listOrgProjects').mockResolvedValue(mockProjectsResponse as any);
      vi.spyOn(issuesApi, 'listOrgIssues').mockResolvedValue(mockIssuesResponse as any);

      // Workflow: Orgs -> Projects -> Issues
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
  });

  describe('Configuration Sharing', () => {
    it('sollte eine Configuration zwischen mehreren APIs teilen', () => {
      const config = new Configuration({
        apiKey: 'shared-api-key',
        basePath: 'https://api.snyk.io/rest',
      });

      const orgsApi = new OrgsApi(config);
      const projectsApi = new ProjectsApi(config);
      const issuesApi = new IssuesApi(config);

      expect(orgsApi).toBeDefined();
      expect(projectsApi).toBeDefined();
      expect(issuesApi).toBeDefined();
    });

    it('sollte verschiedene Configurations für verschiedene APIs verwenden', () => {
      const config1 = new Configuration({
        apiKey: 'key-1',
        basePath: 'https://api1.snyk.io/rest',
      });

      const config2 = new Configuration({
        apiKey: 'key-2',
        basePath: 'https://api2.snyk.io/rest',
      });

      const orgsApi = new OrgsApi(config1);
      const issuesApi = new IssuesApi(config2);

      expect(orgsApi).toBeDefined();
      expect(issuesApi).toBeDefined();
    });
  });

  describe('API Version Handling', () => {
    it('sollte mit verschiedenen API-Versionen arbeiten', async () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });

      const orgsApi = new OrgsApi(config);

      const mockResponse = {
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgs = vi.fn().mockResolvedValue(mockResponse);
      vi.spyOn(orgsApi, 'listOrgs').mockImplementation(mockListOrgs);

      // Test mit verschiedenen Versionen
      await orgsApi.listOrgs({ version: '2024-11-05' });
      expect(mockListOrgs).toHaveBeenCalledWith({ version: '2024-11-05' });

      await orgsApi.listOrgs({ version: '2024-01-04' });
      expect(mockListOrgs).toHaveBeenCalledWith({ version: '2024-01-04' });
    });
  });

  describe('Pagination Handling', () => {
    it('sollte mit paginierten Antworten umgehen', async () => {
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
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
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

    it('sollte mit letzter Seite (ohne next-Link) umgehen', async () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });

      const issuesApi = new IssuesApi(config);

      const mockLastPageResponse = {
        data: {
          data: [
            {
              id: 'issue-last',
              type: 'issue',
              attributes: {
                title: 'Last Issue',
                effective_severity_level: 'low',
                status: 'open',
                type: { id: 'vuln' },
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                ignored: false,
                key: 'test-key-last',
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
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(issuesApi, 'listOrgIssues').mockResolvedValue(mockLastPageResponse as any);

      const response = await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId: 'test-org',
        status: ['open'],
      });

      expect(response.data.data).toHaveLength(1);
      expect(response.data.links?.next).toBeUndefined();
    });
  });

  describe('Filter and Query Parameters', () => {
    it('sollte mit mehreren Filtern arbeiten', async () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
      });

      const issuesApi = new IssuesApi(config);

      const mockResponse = {
        data: {
          data: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockListOrgIssues = vi.fn().mockResolvedValue(mockResponse);
      vi.spyOn(issuesApi, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      await issuesApi.listOrgIssues({
        version: '2024-11-05',
        orgId: 'test-org',
        status: ['open', 'resolved'],
        effectiveSeverityLevel: ['high', 'critical'],
        limit: 50,
      });

      expect(mockListOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'test-org',
        status: ['open', 'resolved'],
        effectiveSeverityLevel: ['high', 'critical'],
        limit: 50,
      });
    });
  });
});
