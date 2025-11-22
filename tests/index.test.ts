import { describe, it, expect } from 'vitest';
import '../src/index';
import * as SnykAPI from '../src/index';
import {
  Configuration,
  ConfigurationParameters,
  BaseAPI,
  OrgsApi,
  ProjectsApi,
  IssuesApi,
  GroupsApi,
  createConfiguration,
} from '../src/index';

describe('Index Module', () => {
  describe('Configuration Exports', () => {
    it('should export Configuration', () => {
      expect(Configuration).toBeDefined();
      expect(typeof Configuration).toBe('function');
    });

    it('should export BaseAPI', () => {
      expect(BaseAPI).toBeDefined();
      expect(typeof BaseAPI).toBe('function');
    });

    it('should create configuration with API key', () => {
      const config = new Configuration({
        apiKey: 'test-api-key',
        basePath: 'https://api.snyk.io/rest',
      });

      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-api-key');
      expect(config.basePath).toBe('https://api.snyk.io/rest');
    });

    it('should create configuration with access token', () => {
      const config = new Configuration({
        accessToken: 'test-token',
      });

      expect(config).toBeDefined();
      expect(config.accessToken).toBe('test-token');
    });
  });

  describe('API Exports', () => {
    it('should export OrgsApi', () => {
      expect(OrgsApi).toBeDefined();
      expect(typeof OrgsApi).toBe('function');
    });

    it('should export ProjectsApi', () => {
      expect(ProjectsApi).toBeDefined();
      expect(typeof ProjectsApi).toBe('function');
    });

    it('should export IssuesApi', () => {
      expect(IssuesApi).toBeDefined();
      expect(typeof IssuesApi).toBe('function');
    });

    it('should export GroupsApi', () => {
      expect(GroupsApi).toBeDefined();
      expect(typeof GroupsApi).toBe('function');
    });
  });

  describe('Wildcard Exports', () => {
    it('should export all generated APIs via wildcard', () => {
      expect(SnykAPI).toBeDefined();
      expect(SnykAPI.Configuration).toBeDefined();
      expect(SnykAPI.BaseAPI).toBeDefined();
      expect(SnykAPI.OrgsApi).toBeDefined();
      expect(SnykAPI.ProjectsApi).toBeDefined();
      expect(SnykAPI.IssuesApi).toBeDefined();
      expect(SnykAPI.GroupsApi).toBeDefined();
    });

    it('should allow instantiation via wildcard exports', () => {
      const config = new SnykAPI.Configuration({
        apiKey: 'test-api-key',
      });

      const orgsApi = new SnykAPI.OrgsApi(config);
      const projectsApi = new SnykAPI.ProjectsApi(config);
      const issuesApi = new SnykAPI.IssuesApi(config);

      expect(orgsApi).toBeInstanceOf(SnykAPI.BaseAPI);
      expect(projectsApi).toBeInstanceOf(SnykAPI.BaseAPI);
      expect(issuesApi).toBeInstanceOf(SnykAPI.BaseAPI);
    });
  });

  describe('Type Exports', () => {
    it('should use ConfigurationParameters type', () => {
      const params: ConfigurationParameters = {
        apiKey: 'test-key',
        basePath: 'https://api.snyk.io/rest',
      };

      expect(params).toBeDefined();
      expect(params.apiKey).toBe('test-key');
      expect(params.basePath).toBe('https://api.snyk.io/rest');
    });

    it('should create Configuration with ConfigurationParameters', () => {
      const params: ConfigurationParameters = {
        accessToken: 'test-token',
      };

      const config = new Configuration(params);
      expect(config).toBeDefined();
      expect(config.accessToken).toBe('test-token');
    });
  });

  describe('Helper Functions', () => {
    it('should export createConfiguration helper', () => {
      expect(createConfiguration).toBeDefined();
      expect(typeof createConfiguration).toBe('function');
    });

    it('should create configuration with API key using helper', () => {
      const config = createConfiguration('test-api-key');
      
      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-api-key');
      expect(config.basePath).toBe('https://api.snyk.io/rest');
    });

    it('should create configuration with custom basePath using helper', () => {
      const config = createConfiguration('test-key', 'https://custom.api.snyk.io');
      
      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-key');
      expect(config.basePath).toBe('https://custom.api.snyk.io');
    });
  });
});
