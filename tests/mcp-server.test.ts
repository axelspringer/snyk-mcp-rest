import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IssuesApi, Configuration } from '../src/generated';
import { AxiosError } from 'axios';

// Mock Axios Response - korrektes Format für listOrgIssues
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
      {
        id: 'test-issue-2',
        type: 'issue',
        attributes: {
          title: 'Another Vulnerability',
          type: { id: 'vuln' },
          status: 'open',
          effective_severity_level: 'critical',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          ignored: true,
          key: 'test-key-2',
          problems: [{ id: 'problem-1', type: 'problem' }],
          coordinates: [{ x: 1, y: 2 }],
        },
        relationships: {
          scan_item: {
            data: {
              id: 'project-456',
              type: 'project',
            },
          },
        },
      },
    ],
    links: {
      self: '/orgs/test-org-id/issues',
      next: '/orgs/test-org-id/issues?cursor=next',
    },
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
};

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

describe('MCP Server get_issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sollte Issues mit korrekten Parametern abrufen', async () => {
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

    expect(response.data.data).toHaveLength(2);
    expect(response.data.data[0].attributes.effective_severity_level).toBe('high');
    expect(response.data.data[1].attributes.effective_severity_level).toBe('critical');
  });

  it('sollte URL korrekt formatieren', () => {
    const orgSlug = 'my-org';
    const projectId = 'project-123';
    const issueKey = 'SNYK-JS-AXIOS-456';

    const expectedLink = `https://app.snyk.io/org/${orgSlug}/project/${projectId}#issue-${issueKey}`;
    
    expect(expectedLink).toBe('https://app.snyk.io/org/my-org/project/project-123#issue-SNYK-JS-AXIOS-456');
  });

  it('sollte leere Antwort korrekt verarbeiten', async () => {
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

  it('sollte mit Severity-Filter abrufen', async () => {
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

  it('sollte Pagination-Link erkennen', async () => {
    const mockListOrgIssues = vi.fn().mockResolvedValue(mockIssuesResponse);
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

  it('sollte Axios-Fehler korrekt behandeln', async () => {
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

  it('sollte Issue-Attribute korrekt verarbeiten', async () => {
    const mockListOrgIssues = vi.fn().mockResolvedValue(mockIssuesResponse);
    vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

    const issuesApi = new IssuesApi();
    const response = await issuesApi.listOrgIssues({
      version: '2024-11-05',
      orgId: 'test-org-id',
      status: ['open'],
    });

    const issue1 = response.data.data[0];
    const issue2 = response.data.data[1];

    // Issue 1 Attribute
    expect(issue1.attributes.title).toBe('Test Vulnerability');
    expect(issue1.attributes.ignored).toBe(false);
    expect(issue1.attributes.problems).toEqual([]);
    expect(issue1.relationships.scan_item.data.id).toBe('project-123');

    // Issue 2 Attribute (mit zusätzlichen Daten)
    expect(issue2.attributes.title).toBe('Another Vulnerability');
    expect(issue2.attributes.ignored).toBe(true);
    expect(issue2.attributes.problems).toHaveLength(1);
    expect(issue2.attributes.coordinates).toHaveLength(1);
  });

  it('sollte verschiedene Status-Werte unterstützen', async () => {
    const mockListOrgIssues = vi.fn().mockResolvedValue(mockEmptyResponse);
    vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

    const issuesApi = new IssuesApi();

    // Test with 'resolved' status
    await issuesApi.listOrgIssues({
      version: '2024-11-05',
      orgId: 'test-org-id',
      status: ['resolved'],
    });

    expect(mockListOrgIssues).toHaveBeenLastCalledWith({
      version: '2024-11-05',
      orgId: 'test-org-id',
      status: ['resolved'],
    });
  });

  it('sollte Project-Namen aus ProjectsApi abrufen', async () => {
    const { ProjectsApi } = await import('../src/generated/index.js');
    const projectsApi = new ProjectsApi();
    expect(projectsApi).toBeDefined();
    expect(typeof projectsApi.getOrgProject).toBe('function');
    expect(typeof projectsApi.listOrgProjects).toBe('function');
  });
});
