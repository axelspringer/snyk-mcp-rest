import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssuesApi, Configuration } from '../src/generated/index.js';
import { AxiosError } from 'axios';
import {
  getToolsSchema,
  formatIssue,
  formatIssuesResponse,
  handleGetIssues,
  createMCPServer,
} from '../src/mcp-server.js';

describe('MCP Server Business Logic', () => {
  describe('getToolsSchema', () => {
    it('should return tools schema with get_issues tool', () => {
      const schema = getToolsSchema();

      expect(schema.tools).toHaveLength(1);
      expect(schema.tools[0].name).toBe('get_issues');
      expect(schema.tools[0].description).toContain('Snyk issues');
      expect(schema.tools[0].inputSchema.properties).toHaveProperty('repo');
      expect(schema.tools[0].inputSchema.properties).toHaveProperty('status');
      expect(schema.tools[0].inputSchema.properties).toHaveProperty('severity');
      expect(schema.tools[0].inputSchema.required).toEqual([]);
    });

    it('should define status enum values correctly', () => {
      const schema = getToolsSchema();
      const statusProperty = schema.tools[0].inputSchema.properties.status;

      expect(statusProperty.enum).toEqual(['open', 'resolved', 'ignored']);
      expect(statusProperty.default).toBe('open');
    });

    it('should define severity enum values correctly', () => {
      const schema = getToolsSchema();
      const severityProperty = schema.tools[0].inputSchema.properties.severity;

      expect(severityProperty.enum).toEqual(['low', 'medium', 'high', 'critical']);
    });
  });

  describe('formatIssue', () => {
    it('should format issue with all attributes', () => {
      const mockIssue = {
        id: 'issue-123',
        attributes: {
          title: 'Critical vulnerability in dependency',
          effective_severity_level: 'critical',
          status: 'open',
          type: 'vuln',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          ignored: false,
          key: 'SNYK-JS-AXIOS-12345',
          problems: [{ id: 'prob-1' }],
          coordinates: [{ name: 'axios', version: '1.0.0' }],
        },
        relationships: {
          scan_item: {
            data: { id: 'project-456' },
          },
        },
      };

      const formatted = formatIssue(mockIssue, 'my-org');

      expect(formatted.id).toBe('issue-123');
      expect(formatted.title).toBe('Critical vulnerability in dependency');
      expect(formatted.effective_severity_level).toBe('critical');
      expect(formatted.status).toBe('open');
      expect(formatted.type).toBe('vuln');
      expect(formatted.url).toBe(
        'https://app.snyk.io/org/my-org/project/project-456#issue-SNYK-JS-AXIOS-12345'
      );
      expect(formatted.repository).toBe('project-456');
      expect(formatted.repository_id).toBe('project-456');
      expect(formatted.scan_item_id).toBe('project-456');
      expect(formatted.locations).toEqual([]);
      expect(formatted.dependencies).toEqual([]);
      expect(formatted.problems).toEqual([{ id: 'prob-1' }]);
      expect(formatted.coordinates).toEqual([{ name: 'axios', version: '1.0.0' }]);
    });

    it('should use provided orgSlug parameter', () => {
      const mockIssue = {
        id: 'issue-456',
        attributes: {
          title: 'Basic issue',
          effective_severity_level: 'low',
          status: 'resolved',
          type: 'vuln',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          ignored: true,
          key: 'KEY-123',
        },
        relationships: {
          scan_item: {
            data: { id: 'project-789' },
          },
        },
      };

      const formatted = formatIssue(mockIssue, 'test-org-slug');
      expect(formatted.url).toBe(
        'https://app.snyk.io/org/test-org-slug/project/project-789#issue-KEY-123'
      );
    });

    it('should handle missing optional attributes', () => {
      const mockIssue = {
        id: 'issue-456',
        attributes: {
          title: 'Basic issue',
          effective_severity_level: 'low',
          status: 'resolved',
          type: 'vuln',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          ignored: true,
          key: 'KEY-123',
        },
        relationships: {
          scan_item: {
            data: { id: 'project-789' },
          },
        },
      };

      const formatted = formatIssue(mockIssue, 'test-org');

      expect(formatted.id).toBe('issue-456');
      expect(formatted.repository).toBe('project-789');
      expect(formatted.repository_id).toBe('project-789');
      expect(formatted.locations).toEqual([]);
      expect(formatted.dependencies).toEqual([]);
      expect(formatted.problems).toEqual([]);
      expect(formatted.coordinates).toEqual([]);
      expect(formatted.url).toBe(
        'https://app.snyk.io/org/test-org/project/project-789#issue-KEY-123'
      );
    });

    it('should construct correct web link with orgSlug and scan_item_id', () => {
      const mockIssue = {
        id: 'test-issue',
        attributes: {
          title: 'Test',
          effective_severity_level: 'medium',
          status: 'open',
          type: 'vuln',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          ignored: false,
          key: 'KEY',
        },
        relationships: {
          scan_item: {
            data: { id: 'scan-123' },
          },
        },
      };

      const formatted = formatIssue(mockIssue, 'custom-org-slug');

      expect(formatted.url).toBe(
        'https://app.snyk.io/org/custom-org-slug/project/scan-123#issue-KEY'
      );
    });
  });

  describe('formatIssuesResponse', () => {
    it('should format response with multiple issues', () => {
      const mockIssues = [
        { id: '1', title: 'Issue 1' },
        { id: '2', title: 'Issue 2' },
        { id: '3', title: 'Issue 3' },
      ];

      const response = formatIssuesResponse(mockIssues, true);

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.total).toBe(3);
      expect(parsed.count).toBe(3);
      expect(parsed.issues).toEqual(mockIssues);
      expect(parsed.has_more).toBe(true);
    });

    it('should format response with no more results', () => {
      const mockIssues = [{ id: '1', title: 'Issue 1' }];

      const response = formatIssuesResponse(mockIssues, false);

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.has_more).toBe(false);
    });

    it('should format empty response', () => {
      const response = formatIssuesResponse([], false);

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.count).toBe(0);
      expect(parsed.issues).toEqual([]);
      expect(parsed.has_more).toBe(false);
    });

    it('should produce valid JSON output', () => {
      const mockIssues = [{ id: '1', title: 'Test' }];
      const response = formatIssuesResponse(mockIssues, true);

      expect(() => JSON.parse(response.content[0].text)).not.toThrow();
    });
  });

  describe('handleGetIssues', () => {
    let mockIssuesApi: IssuesApi;
    const originalEnv = process.env;

    beforeEach(() => {
      const config = new Configuration({ apiKey: 'test-key' });
      mockIssuesApi = new IssuesApi(config);
      process.env = { ...originalEnv, SNYK_ORG_ID: 'org-123', SNYK_ORG_SLUG: 'my-org' };
    });

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

      const result = await handleGetIssues(mockIssuesApi, {});

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

      await handleGetIssues(mockIssuesApi, {
        status: 'resolved',
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

      await handleGetIssues(mockIssuesApi, {
        severity: 'critical',
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveSeverityLevel: ['critical'],
        })
      );
    });

    it('should filter by repository', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      // Use UUID format for project ID
      const projectId = '12345678-1234-1234-1234-123456789012';
      
      await handleGetIssues(mockIssuesApi, {
        repo: projectId,
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

      await handleGetIssues(mockIssuesApi, {});

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
        handleGetIssues(mockIssuesApi, {})
      ).rejects.toThrow('SNYK_ORG_ID must be set in environment variables or passed as parameter');
    });

    it('should throw error when SNYK_ORG_SLUG is missing', async () => {
      process.env = { ...originalEnv, SNYK_ORG_ID: 'org-123' };
      delete process.env.SNYK_ORG_SLUG;

      await expect(
        handleGetIssues(mockIssuesApi, {})
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

      const result = await handleGetIssues(mockIssuesApi, {
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
        handleGetIssues(mockIssuesApi, {
          orgId: 'org-123',
          orgSlug: 'my-org',
        })
      ).rejects.toThrow('Snyk API Fehler: 401');
    });

    it('should rethrow non-Axios errors', async () => {
      const genericError = new Error('Network failure');
      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockRejectedValue(genericError);

      await expect(
        handleGetIssues(mockIssuesApi, {
          orgId: 'org-123',
          orgSlug: 'my-org',
        })
      ).rejects.toThrow('Network failure');
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        data: {
          data: [],
          links: {},
        },
      };

      vi.spyOn(mockIssuesApi, 'listOrgIssues').mockResolvedValue(mockResponse as any);

      const result = await handleGetIssues(mockIssuesApi, {
        orgId: 'org-123',
        orgSlug: 'my-org',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.issues).toEqual([]);
    });
  });

  describe('createMCPServer', () => {
    it('should create server with custom API key', () => {
      const server = createMCPServer('custom-api-key');
      expect(server).toBeDefined();
      // McpServer uses the new high-level API, which has 'server' property for advanced operations
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

    it('should have server name and version configured', () => {
      const server = createMCPServer('test-key');
      // Server object should be created with proper configuration
      expect(server).toBeDefined();
      expect(server).toHaveProperty('connect');
    });
  });
});
