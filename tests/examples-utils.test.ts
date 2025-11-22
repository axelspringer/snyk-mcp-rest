/**
 * Tests for examples utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  parseMCPResponse,
  outputJSON,
  exitWithError,
} from '../examples/utils';

describe('Examples Utils', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('12345678-1234-1234-1234-123456789012')).toBe(true);
      expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
      expect(isValidUUID('ABCDEF01-2345-6789-ABCD-EF0123456789')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('12345678-1234-1234-1234')).toBe(false);
      expect(isValidUUID('12345678-1234-1234-1234-12345678901')).toBe(false);
      expect(isValidUUID('SNYK-JAVA-ORGAPACHE-123456')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('parseMCPResponse', () => {
    it('should parse successful MCP response with JSON content', () => {
      const responseData = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({ foo: 'bar', count: 42 })
          }]
        }
      });

      const result = parseMCPResponse(responseData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ foo: 'bar', count: 42 });
    });

    it('should parse successful MCP response with plain text content', () => {
      const responseData = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{
            type: 'text',
            text: 'Plain text response'
          }]
        }
      });

      const result = parseMCPResponse(responseData);
      expect(result.success).toBe(true);
      expect(result.data).toBe('Plain text response');
    });

    it('should handle JSON-RPC error response', () => {
      const responseData = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Something went wrong'
        }
      });

      const result = parseMCPResponse(responseData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    it('should handle invalid JSON', () => {
      const responseData = 'not valid json';

      const result = parseMCPResponse(responseData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse response');
    });

    it('should handle multi-line response (takes last line)', () => {
      const responseData = 'Some server logs\nMore logs\n' + JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({ result: 'success' })
          }]
        }
      });

      const result = parseMCPResponse(responseData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success' });
    });
  });

  describe('outputJSON', () => {
    it('should format JSON output (visual test)', () => {
      // This is just a smoke test - we can't easily capture console.log
      const data = { test: 'data', nested: { value: 123 } };
      expect(() => outputJSON(data)).not.toThrow();
    });
  });

  describe('exitWithError', () => {
    it('should be a function', () => {
      expect(typeof exitWithError).toBe('function');
    });

    // Note: We can't actually test process.exit() in unit tests
    // as it would terminate the test runner
  });
});
