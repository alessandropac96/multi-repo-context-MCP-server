# Custom Tools Directory

This directory contains custom tool implementations for your specific repositories.

**Note:** Keep custom tools small for now. When they grow, consider forking the repo and committing them.

## Structure

Tools can be organized by:
- **Repository name**: `custom/{repo-name}/index.ts` (repo-specific)
- **Repository type**: `custom/{repo-type}/index.ts` (shared by all repos of that type)

The loader checks in this order:
1. `custom/{repo-name}/index.js` or `.ts`
2. `custom/{repo-type}/index.js` or `.ts`

## Example: Repo-Specific Tools

For `crutrade-smart-contracts`:

Create `custom/crutrade-smart-contracts/index.ts`:

```typescript
import { ToolDefinition } from '../../registry/types.js';

export async function loadTools(repoPath: string): Promise<ToolDefinition[]> {
  return [
    {
      name: 'deploy_contract',
      description: 'Deploy a contract to the network',
      inputSchema: {
        type: 'object',
        properties: {
          contractName: { type: 'string' },
          network: { type: 'string' }
        },
        required: ['contractName']
      },
      handler: async (args, context) => {
        const { contractName, network } = args;
        const { repoPath, logger } = context;
        
        logger.info(`Deploying ${contractName} to ${network}`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ 
              message: `Deployed ${contractName}`,
              repo: repoPath 
            }, null, 2)
          }]
        };
      }
    }
  ];
}
```

## Example: Type-Shared Tools

For all `contracts` repos:

Create `custom/contracts/index.ts`:

```typescript
import { ToolDefinition } from '../../registry/types.js';

export const tools: ToolDefinition[] = [
  {
    name: 'verify_contract',
    description: 'Verify contract on block explorer',
    handler: async (args, context) => {
      // Shared by all contract repos
    }
  }
];
```

## Configuration

In `.multi-repo-mcp/repos.json`, set `"tools": "custom"`:

```json
{
  "name": "crutrade-smart-contracts",
  "path": "/path/to/repo",
  "type": "contracts",
  "tools": "custom"
}
```

## Migration to Fork

When your custom tools grow beyond simple test tools:
1. Fork the generic repo
2. Move `src/tools/custom/` to be committed (remove from .gitignore)
3. Use git to track and sync your customizations
