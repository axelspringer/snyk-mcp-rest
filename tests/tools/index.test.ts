import { describe, it, expect } from 'vitest';
import {
  allTools,
  getIssuesTool,
  getIssueTool,
  getRepoIssuesTool,
  findProjectsTool,
} from '../../src/tools/index';

describe('Tools Index', () => {
  describe('Tool Exports', () => {
    it('should export getIssuesTool', () => {
      expect(getIssuesTool).toBeDefined();
      expect(getIssuesTool.name).toBe('get_issues');
    });

    it('should export getIssueTool', () => {
      expect(getIssueTool).toBeDefined();
      expect(getIssueTool.name).toBe('get_issue');
    });

    it('should export getRepoIssuesTool', () => {
      expect(getRepoIssuesTool).toBeDefined();
      expect(getRepoIssuesTool.name).toBe('get_repo_issues');
    });

    it('should export findProjectsTool', () => {
      expect(findProjectsTool).toBeDefined();
      expect(findProjectsTool.name).toBe('find_projects');
    });
  });

  describe('allTools Array', () => {
    it('should export all tools as an array', () => {
      expect(allTools).toBeDefined();
      expect(Array.isArray(allTools)).toBe(true);
    });

    it('should contain all 4 tools', () => {
      expect(allTools).toHaveLength(4);
    });

    it('should contain getIssuesTool', () => {
      expect(allTools).toContain(getIssuesTool);
    });

    it('should contain getIssueTool', () => {
      expect(allTools).toContain(getIssueTool);
    });

    it('should contain getRepoIssuesTool', () => {
      expect(allTools).toContain(getRepoIssuesTool);
    });

    it('should contain findProjectsTool', () => {
      expect(allTools).toContain(findProjectsTool);
    });

    it('should have all tools with required properties', () => {
      allTools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.handler).toBe('function');
      });
    });

    it('should have unique tool names', () => {
      const names = allTools.map(tool => tool.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(allTools.length);
    });
  });
});
