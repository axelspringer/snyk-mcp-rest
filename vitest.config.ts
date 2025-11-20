import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'src/generated/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/generated/**',  // Auto-generated code
        'src/start-mcp-server.ts', // Standalone server process
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/**',          // Test files themselves
        'coverage/**',
      ],
      include: [
        'src/**/*.ts',       // All source files (except excluded)
      ],
    },
  },
});
