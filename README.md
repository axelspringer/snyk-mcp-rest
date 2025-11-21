# snyk-mcp-rest

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript client for the Snyk REST API with built-in Model Context Protocol (MCP) server support. This package provides both a type-safe API client auto-generated from the official Snyk OpenAPI specification and an MCP server for AI assistant integrations.

## Features

- 🔄 **Auto-generated TypeScript Client** - Generated from official Snyk OpenAPI spec (2025-11-05)
- 🤖 **MCP Server Integration** - Built-in Model Context Protocol server for AI assistants (Claude, etc.)
- 📦 **Complete Type Safety** - Full TypeScript support with IntelliSense
- 🔌 **Axios-based HTTP Client** - Reliable HTTP operations with error handling
- 🧪 **Comprehensive Testing** - Vitest with coverage support
- 🏗️ **Modular Architecture** - Clean separation between generated and custom code

## Installation

```bash
npm install
```

## Build

The build process includes OpenAPI code generation and TypeScript compilation:

```bash
# Full build (generate + compile)
npm run prepare

# Generate API client from OpenAPI spec
npm run generate

# Compile TypeScript only
npm run build
```

## Usage

### Basic API Client Usage

```typescript
import { Configuration, OrgsApi, IssuesApi } from 'snyk-mcp-rest';

// Configure API client
const config = new Configuration({
  apiKey: process.env.SNYK_API_KEY,
  basePath: 'https://api.snyk.io/rest'
});

// Or use the helper function
import { createConfiguration } from 'snyk-mcp-rest';
const config = createConfiguration(process.env.SNYK_API_KEY!);

// Use Organizations API
const orgsApi = new OrgsApi(config);
const orgs = await orgsApi.listOrgs({ 
  version: '2024-11-05' 
});

// Use Issues API
const issuesApi = new IssuesApi(config);
const issues = await issuesApi.listOrgIssues({
  version: '2024-11-05',
  orgId: 'your-org-id',
  status: ['open'],
  limit: 100
});

// Use Projects API to find projects by repository name
const projectsApi = new ProjectsApi(config);
const projects = await projectsApi.listOrgProjects({
  version: '2024-11-05',
  orgId: 'your-org-id',
  names: ['owner/my-repo']  // Filter by repository name
});

// Get project IDs from matching repositories
const projectIds = projects.data.data?.map(p => p.id) || [];

// Fetch issues for specific projects
if (projectIds.length > 0) {
  const projectIssues = await issuesApi.listOrgIssues({
    version: '2024-11-05',
    orgId: 'your-org-id',
    scanItemId: projectIds[0],
    scanItemType: 'project' as any,
    status: ['open']
  });
}
```

### MCP Server Usage

The MCP server provides AI assistants with access to Snyk security data. Configure it in your AI assistant (e.g., Claude Desktop):

#### Starting the MCP Server

```bash
# Development mode (with ts-node)
npm run mcp-server

# Production mode (requires build first)
npm run build
npm run mcp-server:build
```

#### Testing the MCP Server

Test the MCP server without Claude Desktop using the provided test scripts:

**Testing get_issues tool:**

```bash
# Build the project first
npm run build

# Run the get_issues test script
npx ts-node examples/get-issues.ts [repo] [status] [severity]

# Examples:
npx ts-node examples/get-issues.ts                              # All open issues
npx ts-node examples/get-issues.ts owner/repo                   # Open issues for specific repo
npx ts-node examples/get-issues.ts owner/repo resolved          # Resolved issues for repo
npx ts-node examples/get-issues.ts owner/repo open critical     # Critical open issues
npx ts-node examples/get-issues.ts "" resolved high             # All resolved high severity issues
```

The `get-issues.ts` script accepts the same parameters as the `get_issues` MCP tool:

- `repo` - Repository name or Project ID (optional)
- `status` - Issue status: open, resolved, ignored (optional, default: open)
- `severity` - Issue severity: low, medium, high, critical (optional)

**Testing get_issue tool:**

```bash
# Get detailed information about a specific issue
npx ts-node examples/get-issue.ts <issue-id>

# Example:
npx ts-node examples/get-issue.ts 12345678-1234-1234-1234-123456789012
```

The `get-issue.ts` script requires:

- `issue_id` - The unique identifier (UUID) of the issue to retrieve (required)

#### Claude Desktop Configuration

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "snyk": {
      "command": "node",
      "args": [
        "/path/to/snyk-mcp-rest/dist/start-mcp-server.js"
      ],
      "env": {
        "SNYK_API_KEY": "your-snyk-api-key-here",
        "SNYK_ORG_ID": "your-org-id-uuid-here",
        "SNYK_ORG_SLUG": "your-org-slug-here"
      }
    }
  }
}
```

#### Available MCP Tools

- **get_issues** - Retrieve Snyk security issues for an organization
  - Parameters:
    - `repo` (optional): Repository name (e.g., `"owner/repo"`) or Project ID (UUID format). Repository names are automatically resolved to matching project IDs.
    - `status` (optional): Filter by status (`open`, `resolved`, `ignored`)
    - `severity` (optional): Filter by severity (`low`, `medium`, `high`, `critical`)
  - Configuration (via environment variables):
    - `SNYK_ORG_ID` (required): Snyk Organization ID (UUID)
    - `SNYK_ORG_SLUG` (required): Organization slug for URLs
  - Returns: Formatted issues with direct Snyk URLs and resolved project names
  
  **Features**:
  - **Repository Name Filtering**: The `repo` parameter accepts repository names (e.g., `"spring-media/my-repo"`). The server automatically resolves these to project IDs via the Projects API.
  - **Project Name Resolution**: Issues include the actual project/repository name instead of just the project ID. The server fetches project names for all unique projects in the results.
  - **UUID Support**: Project IDs in UUID format (e.g., `"12345678-1234-1234-1234-123456789012"`) are used directly without lookup.

- **get_issue** - Retrieve detailed information about a specific Snyk issue
  - Parameters:
    - `issue_id` (required): The unique identifier (UUID) of the issue to retrieve
  - Configuration (via environment variables):
    - `SNYK_ORG_ID` (required): Snyk Organization ID (UUID)
    - `SNYK_ORG_SLUG` (required): Organization slug for URLs
  - Returns: Detailed issue information including suggested fixes, remediation advice, vulnerability details, upgrade recommendations, and references

## Available APIs

The client provides access to all Snyk REST API endpoints:

- **AccessRequestsApi** - Manage access requests
- **AppsApi** - Snyk Apps management
- **AuditLogsApi** - Audit log access
- **CloudApi** - Cloud security operations
- **ContainerImageApi** - Container image scanning
- **CustomBaseImagesApi** - Custom base image management
- **FindingsApi** - Security findings
- **GroupsApi** / **GroupApi** - Group management
- **IacSettingsApi** - Infrastructure as Code settings
- **InvitesApi** - User invitations
- **IssuesApi** - Security issues management
- **OrgsApi** - Organization operations
- **PoliciesApi** - Policy management
- **ProjectsApi** - Project operations
- **SbomApi** - Software Bill of Materials
- **ServiceAccountsApi** - Service account management
- **SlackApi** / **SlackSettingsApi** - Slack integration
- **TargetsApi** - Target management
- **TenantsApi** - Tenant operations
- **TestsApi** - Testing operations
- **UsersApi** - User management

...and many more! See `src/generated/api/` for the complete list.

## Development

### Running Tests

The project includes comprehensive test coverage:

```bash
# Run all tests once
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode (interactive test runner)
npm run test:ui
```

#### Test Suites

- **API Client Tests** (`tests/api.test.ts`) - Configuration, API instantiation, exports (18 tests)
- **MCP Server Tests** (`tests/mcp-server.test.ts`) - Issue retrieval, filtering, pagination, project name fetching (9 tests)
- **MCP Server Logic Tests** (`tests/mcp-server-logic.test.ts`) - Handler functions, tool schema (20 tests)
- **MCP Business Logic Tests** (`tests/mcp-business-logic.test.ts`) - Issue formatting, response handling (24 tests)
- **Repository Name Filtering Tests** (`tests/repo-name-filtering.test.ts`) - Project name resolution, UUID detection (9 tests)
- **Integration Tests** (`tests/integration.test.ts`) - Multi-API workflows, pagination handling (7 tests)
- **Error Handling Tests** (`tests/error-handling.test.ts`) - HTTP errors, network failures, validation (8 tests)
- **Index Exports Tests** (`tests/index.test.ts`) - Module exports and type definitions (14 tests)

**Test Statistics**: 109 test cases across 8 test files covering core functionality, error scenarios, and edge cases.

**Coverage**: 93%+ overall code coverage (100% for `src/index.ts`, 93%+ for `src/mcp-server.ts`). Generated code (`src/generated/**`) and server startup code (`src/start-mcp-server.ts`) are excluded from coverage as per project policy.

### Project Structure

```text
src/
├── generated/          # Auto-generated (DO NOT EDIT)
│   ├── api/           # API classes
│   ├── models/        # TypeScript interfaces
│   └── configuration.ts, base.ts, common.ts
├── index.ts           # Main entry point - API client exports
├── mcp-server.ts      # MCP server business logic (testable)
└── start-mcp-server.ts # MCP server startup script (standalone)
examples/
├── basic-usage.ts     # Basic API client usage example
├── get-issues.ts      # MCP server testing script (get_issues tool)
└── get-issue.ts       # MCP server testing script (get_issue tool)
tests/
├── api.test.ts                    # API client tests (18 tests)
├── mcp-server.test.ts             # MCP server integration tests (8 tests)
├── mcp-server-logic.test.ts       # MCP handler functions (20 tests)
├── mcp-business-logic.test.ts     # Issue formatting logic (24 tests)
├── repo-name-filtering.test.ts    # Repository name resolution (9 tests)
├── integration.test.ts            # Multi-API workflows (7 tests)
├── error-handling.test.ts         # Error scenarios (8 tests)
└── index.test.ts                  # Module exports (14 tests)
res/
└── snyk-openapi-2025-11-05.json  # OpenAPI specification
```

**Important**: Never edit files in `src/generated/` - they are auto-generated from the OpenAPI spec.

## Error Handling

The client uses Axios for HTTP operations. Handle errors appropriately:

```typescript
import { AxiosError } from 'axios';

try {
  const response = await issuesApi.listOrgIssues({
    version: '2024-11-05',
    orgId: 'your-org-id'
  });
} catch (error) {
  if (error instanceof AxiosError) {
    console.error('API Error:', error.response?.status);
    console.error('Details:', error.response?.data);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Environment Variables

Create a `.env` file in the project root:

```env
SNYK_API_KEY=your-api-key-here
```

For the MCP server, these environment variables are used:

- `SNYK_API_KEY` (required) - Your Snyk API token (get from <https://app.snyk.io/account>)
- `SNYK_ORG_ID` (required) - Your Snyk Organization ID (UUID format)
- `SNYK_ORG_SLUG` (required) - Your Snyk Organization slug for URLs (e.g., `my-org`)

You can find your Organization ID and slug in the Snyk web UI under your organization settings.

## Version Information

- **API Version**: Uses Snyk REST API version `2024-11-05` (all API calls require `version` parameter)
- **OpenAPI Spec**: Generated from `snyk-openapi-2025-11-05.json`
- **TypeScript**: 5.9+
- **Node.js**: Compatible with modern Node.js versions (ES2020 target)

## Configuration

Code generation is configured via `openapitools.json`:

- Template: `typescript-axios`
- Single request parameter: Enabled
- Separate models and API: Enabled
- Output: `./src/generated`

## License

MIT

## Repository

<https://github.com/spring-media/snyk-mcp-rest>

## Releases

This project uses automated GitHub Actions for versioned releases.

### Creating a Release

```bash
# Update version in package.json (patch/minor/major)
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Push the version tag to trigger release workflow
git push origin v1.0.1
```

The GitHub Actions workflow will automatically:

- Run tests to ensure quality
- Build the project
- Create release archives (.tar.gz and .zip)
- Generate changelog from commits
- Publish GitHub release with assets

### Release Artifacts

Each release includes:

- Built JavaScript and TypeScript declarations in `dist/`
- Complete `package.json` for dependency management
- Documentation and license files
- Downloadable archives (.tar.gz and .zip)

## Contributing

1. Make changes to custom code (not `src/generated/`)
2. Update OpenAPI spec or generator config if needed
3. Run `npm test` to verify changes
4. Update this README if adding new features
