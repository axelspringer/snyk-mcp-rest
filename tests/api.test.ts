import { describe, it, expect } from 'vitest';
import { Configuration, OrgsApi, ProjectsApi, IssuesApi, GroupsApi, BaseAPI } from '../src';

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
});
