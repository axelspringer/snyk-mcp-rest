import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectsApi, Configuration } from '../../src/generated/index.js';
import { AxiosError } from 'axios';
import { handleFindProjects, findProjectsTool } from '../../src/tools/find-projects';

describe('Find Projects Tool', () => {
  let mockProjectsApi: ProjectsApi;
  const originalEnv = process.env;

  beforeEach(() => {
    const config = new Configuration({ apiKey: 'test-key' });
    mockProjectsApi = new ProjectsApi(config);
    process.env = { ...originalEnv, SNYK_ORG_ID: 'org-123' };
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(findProjectsTool.name).toBe('find_projects');
    });

    it('should have description', () => {
      expect(findProjectsTool.description).toContain('project');
    });
  });

  describe('handleFindProjects', () => {
    it('should find projects matching query', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              attributes: { name: 'github.com/user/my-repo:package.json' },
            },
            {
              id: 'project-456',
              attributes: { name: 'github.com/user/other-repo:pom.xml' },
            },
            {
              id: 'project-789',
              attributes: { name: 'github.com/user/my-repo:Dockerfile' },
            },
          ],
        },
      };

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockResolvedValue(mockResponse as any);

      const result = await handleFindProjects({
        query: 'my-repo',
      }, {
        issuesApi: {} as any,
        projectsApi: mockProjectsApi,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(2);
      expect(parsed.query).toBe('my-repo');
      expect(parsed.projects).toHaveLength(2);
      expect(parsed.projects[0].projectName).toContain('my-repo');
    });

    it('should perform case-insensitive search', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              attributes: { name: 'GitHub.com/User/MyRepo:Package.json' },
            },
          ],
        },
      };

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockResolvedValue(mockResponse as any);

      const result = await handleFindProjects({
        query: 'myrepo',
      }, {
        issuesApi: {} as any,
        projectsApi: mockProjectsApi,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
    });

    it('should return empty array when no projects match', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              attributes: { name: 'github.com/user/repo:package.json' },
            },
          ],
        },
      };

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockResolvedValue(mockResponse as any);

      const result = await handleFindProjects({
        query: 'nonexistent',
      }, {
        issuesApi: {} as any,
        projectsApi: mockProjectsApi,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.projects).toEqual([]);
    });

    it('should match on file names', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'project-123',
              attributes: { name: 'github.com/user/repo:package.json' },
            },
            {
              id: 'project-456',
              attributes: { name: 'github.com/user/repo:pom.xml' },
            },
            {
              id: 'project-789',
              attributes: { name: 'github.com/user/repo:Dockerfile' },
            },
          ],
        },
      };

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockResolvedValue(mockResponse as any);

      const result = await handleFindProjects({
        query: 'package.json',
      }, {
        issuesApi: {} as any,
        projectsApi: mockProjectsApi,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.projects[0].projectName).toContain('package.json');
    });

    it('should throw error when SNYK_ORG_ID is missing', async () => {
      process.env = { ...originalEnv };
      delete process.env.SNYK_ORG_ID;

      await expect(
        handleFindProjects({
          query: 'test',
        }, {
          issuesApi: {} as any,
          projectsApi: mockProjectsApi,
        })
      ).rejects.toThrow('SNYK_ORG_ID must be set in environment variables or passed as parameter');
    });

    it('should handle API errors', async () => {
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

      vi.spyOn(mockProjectsApi, 'listOrgProjects').mockRejectedValue(axiosError);

      await expect(
        handleFindProjects({
          query: 'test',
        }, {
          issuesApi: {} as any,
          projectsApi: mockProjectsApi,
        })
      ).rejects.toThrow('Snyk API Error: 401');
    });
  });
});
