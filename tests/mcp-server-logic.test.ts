import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getToolsSchema,
  formatIssue,
  formatIssuesResponse,
  handleGetIssues,
  handleListTools,
  handleCallTool,
  createMCPServer,
} from '../src/mcp-server';
import { IssuesApi } from '../src/generated/index.js';
import { AxiosError } from 'axios';

describe('MCP Server Business Logic', () => {
  describe('getToolsSchema', () => {
    it('should return tools schema with get_issues and get_issue tools', () => {
      const schema = getToolsSchema();
      
      expect(schema.tools).toHaveLength(2);
      expect(schema.tools[0].name).toBe('get_issues');
      expect(schema.tools[0].description).toBeTruthy();
      expect(schema.tools[0].inputSchema.required).toEqual([]);
      
      expect(schema.tools[1].name).toBe('get_issue');
      expect(schema.tools[1].description).toContain('detailed information');
      expect(schema.tools[1].inputSchema.required).toEqual(['issue_id']);
    });

    it('should define all expected properties in schema', () => {
      const schema = getToolsSchema();
      const properties = schema.tools[0].inputSchema.properties;
      
      expect(properties.repo).toBeDefined();
      expect(properties.status).toBeDefined();
      expect(properties.severity).toBeDefined();
    });

    it('should define enums for status and severity', () => {
      const schema = getToolsSchema();
      const properties = schema.tools[0].inputSchema.properties;
      
      expect(properties.status).toBeDefined();
      expect(properties.status?.enum).toEqual(['open', 'resolved', 'ignored']);
      expect(properties.severity).toBeDefined();
      expect(properties.severity?.enum).toEqual(['low', 'medium', 'high', 'critical']);
    });
  });

  describe('formatIssue', () => {
    it('should format issue with all required fields', () => {
      const mockIssue = {
        id: 'issue-123',
        attributes: {
          title: 'Test Vulnerability',
          effective_severity_level: 'high',
          status: 'open',
          type: 'vuln',
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
          ignored: false,
          key: 'CVE-2024-1234',
          problems: [{ id: 'p1' }],
          coordinates: [{ x: 1, y: 2 }],
        },
        relationships: {
          scan_item: {
            data: { id: 'scan-456' }
          }
        }
      };

      const formatted = formatIssue(mockIssue, 'my-org');

      expect(formatted.id).toBe('issue-123');
      expect(formatted.title).toBe('Test Vulnerability');
      expect(formatted.effective_severity_level).toBe('high');
      expect(formatted.status).toBe('open');
      expect(formatted.url).toBe('https://app.snyk.io/org/my-org/project/scan-456#issue-CVE-2024-1234');
      expect(formatted.scan_item_id).toBe('scan-456');
    });

    it('should handle missing optional fields', () => {
      const mockIssue = {
        id: 'issue-789',
        attributes: {
          title: 'Simple Issue',
          effective_severity_level: 'low',
          status: 'resolved',
          type: 'license',
          created_at: '2024-02-01',
          updated_at: '2024-02-02',
          ignored: true,
          key: 'LIC-001',
        },
        relationships: {
          scan_item: {
            data: { id: 'scan-999' }
          }
        }
      };

      const formatted = formatIssue(mockIssue, 'test-org');

      expect(formatted.problems).toEqual([]);
      expect(formatted.coordinates).toEqual([]);
    });
  });

  describe('formatIssuesResponse', () => {
    it('should format response with issues and metadata', () => {
      const issues = [
        { id: '1', title: 'Issue 1' },
        { id: '2', title: 'Issue 2' },
      ];

      const response = formatIssuesResponse(issues as any, true);

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.total).toBe(2);
      expect(parsed.count).toBe(2);
      expect(parsed.issues).toEqual(issues);
      expect(parsed.has_more).toBe(true);
    });

    it('should indicate no more results when hasMore is false', () => {
      const response = formatIssuesResponse([], false);
      const parsed = JSON.parse(response.content[0].text);
      
      expect(parsed.has_more).toBe(false);
      expect(parsed.total).toBe(0);
    });
  });

  describe('handleGetIssues', () => {
    let mockIssuesApi: IssuesApi;
    const originalEnv = process.env;

    beforeEach(() => {
      mockIssuesApi = {
        listOrgIssues: vi.fn(),
      } as any;
      process.env = { ...originalEnv, SNYK_ORG_ID: 'env-org-123', SNYK_ORG_SLUG: 'env-org' };
    });

    it('should retrieve and format issues successfully using environment variables', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              attributes: {
                title: 'Critical Vulnerability',
                effective_severity_level: 'critical',
                status: 'open',
                type: 'vuln',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                ignored: false,
                key: 'CVE-2024-0001',
              },
              relationships: {
                scan_item: { data: { id: 'scan-1' } }
              }
            }
          ],
          links: { next: 'https://api.snyk.io/next-page' }
        }
      };

      vi.mocked(mockIssuesApi.listOrgIssues).mockResolvedValue(mockResponse as any);

      const result = await handleGetIssues(mockIssuesApi, {});

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'env-org-123',
        status: ['open'],
        limit: 100,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.issues[0].id).toBe('issue-1');
      expect(parsed.has_more).toBe(true);
    });

    it('should apply filters for repo, status, and severity', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.mocked(mockIssuesApi.listOrgIssues).mockResolvedValue(mockResponse as any);

      // Use UUID format for project ID
      const projectId = '87654321-4321-4321-4321-210987654321';
      
      await handleGetIssues(mockIssuesApi, {
        repo: projectId,
        status: 'resolved',
        severity: 'high',
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'env-org-123',
        status: ['resolved'],
        effectiveSeverityLevel: ['high'],
        scanItemId: projectId,
        scanItemType: 'project',
        limit: 100,
      });
    });

    it('should allow parameter overrides for orgId and orgSlug', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.mocked(mockIssuesApi.listOrgIssues).mockResolvedValue(mockResponse as any);

      await handleGetIssues(mockIssuesApi, {
        orgId: 'override-org-456',
        orgSlug: 'override-org',
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'override-org-456',
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
      process.env = { ...originalEnv, SNYK_ORG_ID: 'env-org-123' };
      delete process.env.SNYK_ORG_SLUG;

      await expect(
        handleGetIssues(mockIssuesApi, {})
      ).rejects.toThrow('SNYK_ORG_SLUG must be set in environment variables or passed as parameter');
    });

    it('should throw error on Axios errors', async () => {
      const axiosError = new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Not found' },
          headers: {},
          config: {} as any,
        }
      );

      vi.mocked(mockIssuesApi.listOrgIssues).mockRejectedValue(axiosError);

      await expect(
        handleGetIssues(mockIssuesApi, {})
      ).rejects.toThrow('Snyk API Fehler: 404');
    });

    it('should re-throw non-Axios errors', async () => {
      const genericError = new Error('Network failure');
      vi.mocked(mockIssuesApi.listOrgIssues).mockRejectedValue(genericError);

      await expect(
        handleGetIssues(mockIssuesApi, {})
      ).rejects.toThrow('Network failure');
    });

    it('should handle empty response', async () => {
      const mockResponse = { data: { data: [], links: {} } };
      vi.mocked(mockIssuesApi.listOrgIssues).mockResolvedValue(mockResponse as any);

      const result = await handleGetIssues(mockIssuesApi, {});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.issues).toEqual([]);
      expect(parsed.has_more).toBe(false);
    });
  });

  describe('createMCPServer', () => {
    it('should create server with default configuration', () => {
      const server = createMCPServer();
      expect(server).toBeDefined();
    });

    it('should create server with custom API key', () => {
      const server = createMCPServer('custom-api-key-123');
      expect(server).toBeDefined();
    });

    it('should use environment variable if no API key provided', () => {
      process.env.SNYK_API_KEY = 'env-api-key';
      const server = createMCPServer();
      expect(server).toBeDefined();
    });
  });

  describe('handleListTools', () => {
    it('should return tools schema', async () => {
      const result = await handleListTools();
      
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe('get_issues');
      expect(result.tools[1].name).toBe('get_issue');
    });
  });

  describe('handleCallTool', () => {
    let mockIssuesApi: IssuesApi;
    const originalEnv = process.env;

    beforeEach(() => {
      mockIssuesApi = {
        listOrgIssues: vi.fn(),
      } as any;
      process.env = { ...originalEnv, SNYK_ORG_ID: 'env-org-123', SNYK_ORG_SLUG: 'env-org' };
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        handleCallTool(mockIssuesApi, {
          params: {
            name: 'unknown_tool',
            arguments: {},
          },
        })
      ).rejects.toThrow('Unbekanntes Tool: unknown_tool');
    });

    it('should call handleGetIssues for get_issues tool', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'issue-1',
              attributes: {
                title: 'Test Issue',
                effective_severity_level: 'high',
                status: 'open',
                type: 'vuln',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                ignored: false,
                key: 'CVE-2024-0001',
              },
              relationships: {
                scan_item: { data: { id: 'scan-1' } }
              }
            }
          ],
          links: {}
        }
      };

      vi.mocked(mockIssuesApi.listOrgIssues).mockResolvedValue(mockResponse as any);

      // Use UUID format for project ID
      const projectId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      const result = await handleCallTool(mockIssuesApi, {
        params: {
          name: 'get_issues',
          arguments: {
            repo: projectId,
          },
        },
      });

      expect(mockIssuesApi.listOrgIssues).toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issues).toHaveLength(1);
    });
  });
});
