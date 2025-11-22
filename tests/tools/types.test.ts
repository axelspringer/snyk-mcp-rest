import { describe, it, expect } from 'vitest';
import type { MCPTool, ToolContext, ToolResponse } from '../../src/tools/types';
import { z } from 'zod';

describe('Tools Types', () => {
  describe('MCPTool Interface', () => {
    it('should define valid MCPTool with required properties', () => {
      const testSchema = z.object({
        testParam: z.string(),
      });

      const testTool: MCPTool<typeof testSchema> = {
        name: 'test_tool',
        description: 'Test tool description',
        inputSchema: testSchema,
        handler: async (args, context) => {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ result: args.testParam }),
              },
            ],
          };
        },
      };

      expect(testTool.name).toBe('test_tool');
      expect(testTool.description).toBe('Test tool description');
      expect(testTool.inputSchema).toBeDefined();
      expect(typeof testTool.handler).toBe('function');
    });

    it('should validate input schema', () => {
      const testSchema = z.object({
        requiredField: z.string(),
        optionalField: z.number().optional(),
      });

      // Valid input
      const validResult = testSchema.safeParse({
        requiredField: 'test',
        optionalField: 42,
      });
      expect(validResult.success).toBe(true);

      // Invalid input (missing required field)
      const invalidResult = testSchema.safeParse({
        optionalField: 42,
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('ToolContext Interface', () => {
    it('should define ToolContext with required API clients', () => {
      const mockContext: ToolContext = {
        issuesApi: {} as any,
        projectsApi: {} as any,
      };

      expect(mockContext.issuesApi).toBeDefined();
      expect(mockContext.projectsApi).toBeDefined();
    });

    it('should define ToolContext with optional org parameters', () => {
      const mockContext: ToolContext = {
        issuesApi: {} as any,
        projectsApi: {} as any,
        orgId: 'test-org-id',
        orgSlug: 'test-org-slug',
      };

      expect(mockContext.orgId).toBe('test-org-id');
      expect(mockContext.orgSlug).toBe('test-org-slug');
    });
  });

  describe('ToolResponse Interface', () => {
    it('should define valid ToolResponse structure', () => {
      const testResponse: ToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Test response',
          },
        ],
      };

      expect(testResponse.content).toHaveLength(1);
      expect(testResponse.content[0].type).toBe('text');
      expect(testResponse.content[0].text).toBe('Test response');
    });

    it('should allow additional properties in ToolResponse', () => {
      const testResponse: ToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Test',
          },
        ],
        customProperty: 'custom value',
        anotherProperty: 123,
      };

      expect(testResponse.customProperty).toBe('custom value');
      expect(testResponse.anotherProperty).toBe(123);
    });

    it('should allow multiple content items', () => {
      const testResponse: ToolResponse = {
        content: [
          {
            type: 'text',
            text: 'First item',
          },
          {
            type: 'text',
            text: 'Second item',
          },
        ],
      };

      expect(testResponse.content).toHaveLength(2);
      expect(testResponse.content[0].text).toBe('First item');
      expect(testResponse.content[1].text).toBe('Second item');
    });
  });
});
