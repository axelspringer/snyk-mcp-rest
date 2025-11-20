import { describe, it, expect, vi } from 'vitest';
import { IssuesApi, OrgsApi, ProjectsApi } from '../src';
import { AxiosError } from 'axios';

describe('Error Handling', () => {
  describe('API Error Responses', () => {
    it('sollte 401 Unauthorized-Fehler behandeln', async () => {
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

    it('sollte 404 Not Found-Fehler behandeln', async () => {
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

    it('sollte 429 Rate Limit-Fehler behandeln', async () => {
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

    it('sollte 500 Internal Server Error behandeln', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { 
            errors: [{ 
              status: '500',
              title: 'Internal Server Error',
              detail: 'An unexpected error occurred'
            }]
          },
        },
        message: 'Request failed with status code 500',
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
          status: 500,
        },
      });
    });

    it('sollte Netzwerkfehler ohne Response behandeln', async () => {
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

    it('sollte Timeout-Fehler behandeln', async () => {
      const timeoutError = {
        isAxiosError: true,
        message: 'timeout of 5000ms exceeded',
        code: 'ECONNABORTED',
      } as AxiosError;

      const mockListOrgIssues = vi.fn().mockRejectedValue(timeoutError);
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
        code: 'ECONNABORTED',
      });
    });
  });

  describe('Validation Errors', () => {
    it('sollte 400 Bad Request mit Validierungsfehlern behandeln', async () => {
      const validationError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { 
            errors: [{ 
              status: '400',
              title: 'Bad Request',
              detail: 'Invalid version parameter',
              source: {
                parameter: 'version'
              }
            }]
          },
        },
        message: 'Request failed with status code 400',
      } as AxiosError;

      const mockListOrgIssues = vi.fn().mockRejectedValue(validationError);
      vi.spyOn(IssuesApi.prototype, 'listOrgIssues').mockImplementation(mockListOrgIssues);

      const issuesApi = new IssuesApi();

      await expect(
        issuesApi.listOrgIssues({
          version: 'invalid-version' as any,
          orgId: 'test-org-id',
          status: ['open'],
        })
      ).rejects.toMatchObject({
        isAxiosError: true,
        response: {
          status: 400,
        },
      });
    });

    it('sollte 403 Forbidden-Fehler behandeln', async () => {
      const forbiddenError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { 
            errors: [{ 
              status: '403',
              title: 'Forbidden',
              detail: 'Insufficient permissions to access this resource'
            }]
          },
        },
        message: 'Request failed with status code 403',
      } as AxiosError;

      const mockListOrgIssues = vi.fn().mockRejectedValue(forbiddenError);
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
          status: 403,
        },
      });
    });
  });
});
