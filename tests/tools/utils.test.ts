import { describe, it, expect } from 'vitest';
import { formatIssue, formatIssuesResponse } from '../../src/tools/utils';

describe('Tools Utils', () => {
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
      expect(formatted.repository).toBe(null);
      expect(formatted.project_id).toBe('project-456');
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
      expect(formatted.repository).toBe(null);
      expect(formatted.project_id).toBe('project-789');
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

    it('should use repository name when provided', () => {
      const mockIssue = {
        id: 'issue-123',
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
            data: { id: 'project-123' },
          },
        },
      };

      const formatted = formatIssue(mockIssue, 'my-org', 'github.com/user/repo:package.json');

      expect(formatted.repository).toBe('github.com/user/repo:package.json');
      expect(formatted.project_id).toBe('project-123');
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
});
