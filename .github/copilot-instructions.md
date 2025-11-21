# GitHub Copilot Instructions for snyk-mcp-rest

## Project Overview

This is an auto-generated TypeScript client for the Snyk REST API built with OpenAPI Generator. The architecture separates generated code (`src/generated/`) from custom code (`src/index.ts`), with the entry point re-exporting the generated API classes.

## Critical: Generated Code Protection

**NEVER edit files in `src/generated/`** - they are auto-generated from `res/snyk-openapi-2025-11-05.json` via OpenAPI Generator.
**NEVER edit `res/snyk-openapi-2025-11-05.json`**.

- Generated code is recreated on every `npm run generate`
- To fix issues in generated code, modify the OpenAPI spec or `openapitools.json` config
- Coverage exclusion explicitly ignores `src/generated/**` (see `vitest.config.ts`)

## Code Generation Workflow

The project uses OpenAPI Generator (`typescript-axios` template) configured in `openapitools.json`:

```bash
npm run generate  # Regenerates src/generated/ from OpenAPI spec
npm run build     # Compiles TypeScript to dist/
npm run prepare   # Runs both generate + build (used in package lifecycle)
```

Generator config details:
- Output: `./src/generated`
- Template: `typescript-axios` (Axios-based HTTP client)
- Key options: `useSingleRequestParameter: true` (all API params in one object)
- Organized into `models/` (TypeScript interfaces) and `api/` (API classes)

## API Usage Patterns

All Snyk API calls require a `version` parameter (e.g., `'2024-11-05'`). Authentication uses either `apiKey` or `accessToken`:

```typescript
const config = new Configuration({
  apiKey: process.env.SNYK_API_KEY,
  basePath: 'https://api.snyk.io/rest'
});

const orgsApi = new OrgsApi(config);
const response = await orgsApi.listOrgs({ version: '2024-11-05' });
```

Key API classes available: `OrgsApi`, `ProjectsApi`, `IssuesApi`, `GroupsApi`, etc. (see `src/generated/api/` for full list).

## Testing Requirements

**CRITICAL: After making code changes, always follow this workflow:**

1. **Fix linting and syntax errors first**
   - Run TypeScript compiler to check for syntax errors: `npx tsc --noEmit`
   - Fix all TypeScript compilation errors before proceeding
   - Ensure code passes linting rules
   - Never proceed to testing with compilation errors

2. **Run and fix tests**
   - Run `npm test` after all syntax/linting errors are resolved
   - Fix any failing tests
   - Ensure all tests pass before considering the task complete

**This is a strict project requirement - do not skip steps.**

Test configuration (`vitest.config.ts`):
- Test environment: Node.js
- Test files: `**/*.test.ts` or `**/*.spec.ts`
- Coverage excludes generated code: `src/generated/**`
- Coverage provider: v8

Test patterns observed in `tests/api.test.ts`:
- Configuration tests (API key vs. access token)
- API instantiation tests
- No live API calls in unit tests (use mocking for integration tests)

## Build & TypeScript Configuration

- Target: ES2020, CommonJS modules (`"type": "commonjs"` in package.json)
- Strict mode disabled (`"strict": false`) due to generated code compatibility
- Output: `dist/` with declarations (`.d.ts`) and source maps

## Documentation Maintenance

**Always update `README.md` after significant changes:**
- New features → Add usage examples
- API changes → Update code snippets
- Configuration changes → Update environment variables section
- **Keep English language consistent - ALL documentation and code must be in English**

The README follows this structure:
1. Features/Overview
2. Installation/Build
3. Usage examples (basic → advanced)
4. Available APIs
5. Development/Testing
6. Error handling
7. Environment variables

## Code and Communication Standards

**CRITICAL: All code, comments, documentation, commit messages, and PR descriptions MUST be in English.**

- Code: English variable names, function names, class names
- Comments: English only (inline, JSDoc, file headers)
- Tests: English test descriptions and assertions
- Documentation: English README, CHANGELOG, API docs
- Git: English commit messages and branch names
- Error messages: English user-facing messages

## Project Structure

```
src/
├── generated/          # Auto-generated (DO NOT EDIT)
│   ├── api/           # API classes (OrgsApi, ProjectsApi, etc.)
│   ├── models/        # TypeScript models/interfaces
│   └── configuration.ts, base.ts, common.ts
├── index.ts           # Entry point - re-exports generated code
examples/
├── basic-usage.ts     # Reference implementation
tests/
├── api.test.ts        # Unit tests
res/
├── snyk-openapi-2025-11-05.json  # Source of truth for API
```

## Environment Variables

Standard pattern uses `.env` file (not tracked in git):
```
SNYK_API_KEY=your-api-key-here
SNYK_BASE_PATH=https://api.snyk.io/rest
```

## Error Handling Pattern

Use Axios error handling for API calls:
```typescript
import { AxiosError } from 'axios';

try {
  const response = await api.someMethod({ version: '2024-11-05' });
} catch (error) {
  if (error instanceof AxiosError) {
    console.error('API Error:', error.response?.status);
    console.error('Details:', error.response?.data);
  }
}
```

## Dependencies

- Runtime: `axios` (HTTP client)
- Build: TypeScript 5.9+, OpenAPI Generator CLI
- Testing: Vitest + @vitest/ui
- Generated code uses Axios for all HTTP operations
