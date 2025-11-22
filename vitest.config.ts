import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    silent: false,
    hideSkippedTests: false,
    onConsoleLog: () => false, // Suppress all console logs
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'src/generated/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/generated/**',  // Auto-generated code
        'src/mcp-server.ts', // Exclude server startup code (if/require.main check)
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
