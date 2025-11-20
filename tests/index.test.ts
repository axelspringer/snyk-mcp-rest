import { describe, it, expect } from 'vitest';

// Importiere explizit, um Coverage zu triggern
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

describe('Index Exports', () => {
  describe('Configuration Exports', () => {
    it('sollte Configuration exportieren', () => {
      expect(Configuration).toBeDefined();
      expect(typeof Configuration).toBe('function');
    });

    it('sollte BaseAPI exportieren', () => {
      expect(BaseAPI).toBeDefined();
      expect(typeof BaseAPI).toBe('function');
    });
  });

  describe('API Exports', () => {
    it('sollte OrgsApi exportieren', () => {
      expect(OrgsApi).toBeDefined();
      expect(typeof OrgsApi).toBe('function');
    });

    it('sollte ProjectsApi exportieren', () => {
      expect(ProjectsApi).toBeDefined();
      expect(typeof ProjectsApi).toBe('function');
    });

    it('sollte IssuesApi exportieren', () => {
      expect(IssuesApi).toBeDefined();
      expect(typeof IssuesApi).toBe('function');
    });

    it('sollte GroupsApi exportieren', () => {
      expect(GroupsApi).toBeDefined();
      expect(typeof GroupsApi).toBe('function');
    });
  });

  describe('Wildcard Exports', () => {
    it('sollte alle generierten Exports verfügbar machen', () => {
      expect(SnykAPI).toBeDefined();
      expect(SnykAPI.Configuration).toBeDefined();
      expect(SnykAPI.BaseAPI).toBeDefined();
      expect(SnykAPI.OrgsApi).toBeDefined();
      expect(SnykAPI.ProjectsApi).toBeDefined();
      expect(SnykAPI.IssuesApi).toBeDefined();
    });

    it('sollte weitere API-Klassen exportieren', () => {
      // Teste, dass weitere APIs aus dem generated-Modul verfügbar sind
      expect(SnykAPI.GroupsApi).toBeDefined();
      
      // Prüfe, dass die Exports vom Typ function sind (Konstruktoren)
      expect(typeof SnykAPI.OrgsApi).toBe('function');
      expect(typeof SnykAPI.ProjectsApi).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('sollte ConfigurationParameters-Typ verwenden können', () => {
      const params: ConfigurationParameters = {
        apiKey: 'test-key',
        basePath: 'https://api.snyk.io/rest',
      };

      expect(params).toBeDefined();
      expect(params.apiKey).toBe('test-key');
      expect(params.basePath).toBe('https://api.snyk.io/rest');
    });

    it('sollte Configuration mit ConfigurationParameters erstellen', () => {
      const params: ConfigurationParameters = {
        accessToken: 'test-token',
      };

      const config = new Configuration(params);
      expect(config).toBeDefined();
      expect(config.accessToken).toBe('test-token');
    });
  });

  describe('API Instantiation via Index', () => {
    it('sollte API-Instanzen über Index-Exports erstellen', () => {
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

  describe('Helper Functions', () => {
    it('sollte createConfiguration-Helper verwenden können', () => {
      const config = createConfiguration('test-api-key');
      
      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-api-key');
      expect(config.basePath).toBe('https://api.snyk.io/rest');
    });

    it('sollte createConfiguration mit custom basePath verwenden', () => {
      const config = createConfiguration('test-key', 'https://custom.api.snyk.io');
      
      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-key');
      expect(config.basePath).toBe('https://custom.api.snyk.io');
    });

    it('sollte exportierte createConfiguration-Funktion haben', () => {
      expect(createConfiguration).toBeDefined();
      expect(typeof createConfiguration).toBe('function');
    });
  });
});
