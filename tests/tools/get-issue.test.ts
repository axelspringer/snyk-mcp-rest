import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssuesApi, Configuration } from '../../src/generated/index.js';
import { AxiosError } from 'axios';
import { handleGetIssue, getIssueTool, getIssueInputSchema } from '../../src/tools/get-issue';

describe('Get Issue Tool', () => {
  let mockIssuesApi: IssuesApi;
  const originalEnv = process.env;

  beforeEach(() => {
    const config = new Configuration({ apiKey: 'test-key' });
    mockIssuesApi = new IssuesApi(config);
    process.env = { ...originalEnv, SNYK_ORG_ID: 'org-123', SNYK_ORG_SLUG: 'my-org' };
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(getIssueTool.name).toBe('get_issue');
    });

    it('should have description mentioning UUID requirement', () => {
      expect(getIssueTool.description).toContain('UUID');
    });

    it('should validate UUID format for issue_id', () => {
      const validUuid = '4a18d42f-0706-4ad0-b127-24078731fbed';
      const invalidUuid = 'SNYK-JAVA-ORG';

      const validResult = getIssueInputSchema.safeParse({ issue_id: validUuid });
      expect(validResult.success).toBe(true);

      const invalidResult = getIssueInputSchema.safeParse({ issue_id: invalidUuid });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('handleGetIssue', () => {
    it('should retrieve detailed issue information', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'issue-123',
            attributes: {
              title: 'Detailed Vulnerability',
              effective_severity_level: 'critical',
              status: 'open',
              type: 'vuln',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
              key: 'SNYK-JS-TEST-123',
              problems: [{ disclosed_at: '2024-01-01' }],
              coordinates: [],
              classes: [],
            },
            relationships: {
              scan_item: { data: { id: 'project-456' } },
            },
          },
        },
        status: 200,
      };

      vi.spyOn(mockIssuesApi, 'getOrgIssueByIssueID').mockResolvedValue(mockResponse as any);

      const result = await handleGetIssue({
        issue_id: 'issue-123',
      }, {
        issuesApi: mockIssuesApi,
        projectsApi: {} as any,
      });

      expect(mockIssuesApi.getOrgIssueByIssueID).toHaveBeenCalledWith({
        version: '2024-11-05',
        orgId: 'org-123',
        issueId: 'issue-123',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe('issue-123');
      expect(parsed.title).toBe('Detailed Vulnerability');
      expect(parsed.url).toContain('my-org');
      expect(parsed.url).toContain('project-456');
    });

    it('should throw error when SNYK_ORG_ID is missing', async () => {
      process.env = { ...originalEnv };
      delete process.env.SNYK_ORG_ID;

      await expect(
        handleGetIssue({
          issue_id: 'issue-123',
        }, {
          issuesApi: mockIssuesApi,
          projectsApi: {} as any,
        })
      ).rejects.toThrow('SNYK_ORG_ID must be set in environment variables or passed as parameter');
    });

    it('should handle API errors', async () => {
      const axiosError = new AxiosError(
        'Not Found',
        '404',
        undefined,
        {},
        {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Issue not found' },
          headers: {},
          config: {} as any,
        }
      );

      vi.spyOn(mockIssuesApi, 'getOrgIssueByIssueID').mockRejectedValue(axiosError);

      await expect(
        handleGetIssue({
          issue_id: 'issue-123',
        }, {
          issuesApi: mockIssuesApi,
          projectsApi: {} as any,
        })
      ).rejects.toThrow('Snyk API Error: 404');
    });
  });
});
