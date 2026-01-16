# Multi-Repo Context MCP Server

A reusable template for a hierarchical MCP (Model Context Protocol) server that provides cross-repository context and tooling. The server organizes tools by repository namespace, supports dynamic discovery, and allows easy extension through a plugin-like architecture.

## Features

- **Hierarchical tool organization**: Root tools for cross-repo operations and repo-specific namespaced tools
- **Dynamic repository discovery**: Automatically finds repositories from config, environment, or parent directories
- **Plugin architecture**: Easy to extend with new repos and tools
- **Type-safe**: Full TypeScript support with proper interfaces
- **Flexible configuration**: Multiple configuration sources with priority ordering
- **Lazy loading**: Load repo tools on demand to reduce startup time

## Architecture

The server provides:

- **Root tools** for cross-repository operations (list repos, search across repos)
- **Repo-specific tools** namespaced by repository (e.g., `repo-name:tool-name`)
- **Dynamic discovery** that finds repositories automatically or via configuration
- **Plugin architecture** for easy addition of new repos and tools

## Installation

```bash
npm install
# or
bun install
```

## Configuration

Create a configuration file at one of these locations (checked in priority order):

1. `.multi-repo-mcp/repos.json` (project-local)
2. `~/.multi-repo-mcp/repos.json` (user config)
3. Environment variable `MULTI_REPO_MCP_CONFIG` pointing to a config file
4. Default configuration (auto-discovery enabled)

### Configuration Format

```json
{
  "repos": [
    {
      "name": "my-contracts",
      "path": "/path/to/contracts",
      "type": "contracts",
      "tools": "builtin"
    },
    {
      "name": "my-backend",
      "path": "/path/to/backend",
      "type": "backend",
      "tools": "builtin"
    },
    {
      "name": "my-custom-repo",
      "path": "/path/to/custom",
      "type": "unknown",
      "tools": "custom"
    }
  ],
  "discovery": {
    "enabled": true,
    "parentPath": "/path/to/parent",
    "autoDetectType": true
  },
  "tools": {
    "lazyLoad": true,
    "cacheResults": true
  }
}
```

### Configuration Options

- **repos**: Array of repository configurations
  - **name**: Unique identifier for the repository
  - **path**: Absolute or relative path to the repository
  - **type**: Repository type (contracts, backend, frontend, infrastructure, unknown)
  - **tools**: Tool source - `"builtin"`, `"custom"`, or a path to a tool module

- **discovery**: Auto-discovery settings
  - **enabled**: Enable automatic repository discovery
  - **parentPath**: Path to scan for repositories
  - **autoDetectType**: Automatically detect repository type

- **tools**: Tool loading settings
  - **lazyLoad**: Load repo tools on first use (default: true)
  - **cacheResults**: Cache tool results (default: true)

## Usage

### Development

```bash
npm run dev
# or
bun run dev
```

### Build

```bash
npm run build
```

### Run

```bash
npm start
```

## Root Tools

The server provides three built-in root tools:

### `list_repos`

Lists all discovered repositories with metadata.

**Input:** None

**Output:** Array of repo info (name, path, type)

### `search_across_repos`

Search across all repositories using file system search.

**Input:**
- `query: string` (required) - Search query
- `repoFilter?: string[]` (optional) - Limit search to specific repos
- `fileTypes?: string[]` (optional) - Filter by file extensions

**Output:** Search results grouped by repository

### `get_repo_info`

Get detailed information about a specific repository.

**Input:**
- `repo: string` (required) - Repository name

**Output:** Repo metadata, available tools, file structure summary

## Adding Repository Tools

### Built-in Module

1. Create directory: `src/tools/examples/{repo-type}/`
2. Create `index.ts` that exports a `loadTools` function:

```typescript
import { ToolDefinition } from '../../registry/types.js';

export async function loadTools(repoPath: string): Promise<ToolDefinition[]> {
  return [
    {
      name: 'my_tool',
      description: 'Does something useful',
      inputSchema: {
        type: 'object',
        properties: {
          param: { type: 'string' }
        },
        required: ['param']
      },
      handler: async (args, context) => {
        // Tool implementation
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ result: 'success' }, null, 2)
          }]
        };
      }
    }
  ];
}
```

3. The tools will be automatically loaded for repositories of that type

### Custom Repo Tools

Repos can define their own tools in `.mcp-tools/index.ts`:

```typescript
import { ToolDefinition } from 'path/to/types';

export const tools: ToolDefinition[] = [
  {
    name: 'custom_tool',
    description: 'Repo-specific tool',
    handler: async (args, context) => {
      // Tool implementation
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ result: 'success' }, null, 2)
        }]
      };
    }
  }
];
```

Set `"tools": "custom"` in the repository configuration to use custom tools.

## Repository Type Detection

The server automatically detects repository types based on file structure:

- **Contracts**: `foundry.toml`, `hardhat.config.*`, `truffle-config.*`
- **Backend**: `package.json` with server framework dependencies
- **Frontend**: `package.json` with frontend framework dependencies
- **Infrastructure**: `terraform/`, `cdk.json`, `serverless.yml`

## Example Repository Tools

### Contracts Repository

- `get_contract_abi` - Get the ABI for a specific contract
- `get_contract_address` - Get the deployed address for a contract

### Backend Repository

- `get_api_endpoint` - Get API endpoint configuration

## Project Structure

```
multi-repo-mcp/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # MCP server setup & initialization
│   ├── registry/                   # Tool and repo registries
│   │   ├── ToolRegistry.ts
│   │   ├── RepoRegistry.ts
│   │   └── types.ts
│   ├── tools/                      # Tool definitions
│   │   ├── root/                   # Root-level tools
│   │   └── examples/               # Example repo tool modules
│   ├── discovery/                  # Repository discovery
│   │   ├── RepoDiscoverer.ts
│   │   ├── RepoTypeDetector.ts
│   │   └── RepoValidator.ts
│   ├── loader/                     # Dynamic tool loading
│   │   ├── ToolLoader.ts
│   │   └── RepoToolLoader.ts
│   └── config/                     # Configuration management
│       ├── ConfigLoader.ts
│       └── defaults.ts
├── templates/                      # Templates for new modules
│   └── repo-tool-module/
├── config/                         # Configuration files
│   └── repos.example.json
└── README.md
```

## Tool Definition Pattern

All tools follow this interface:

```typescript
interface ToolDefinition {
  name: string;                    // Tool name (without namespace)
  description: string;             // Human-readable description
  inputSchema?: JSONSchema;         // JSON Schema for input validation
  handler: (args: any, context: ToolContext) => Promise<ToolResult>;
  repo?: string;                   // Optional repo namespace
}

interface ToolContext {
  repoPath: string;                // Absolute path to repo
  repoInfo: RepoInfo;              // Repo metadata
  logger: Logger;                  // Logger instance
}

interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

## Environment Variables

- `MULTI_REPO_MCP_CONFIG` - Path to configuration file
- `MULTI_REPO_MCP_REPOS_PATH` - Path to scan for repositories
- `DEBUG` - Enable debug logging

## License

MIT
