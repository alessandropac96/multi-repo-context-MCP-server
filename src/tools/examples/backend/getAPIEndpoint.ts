import { ToolDefinition, ToolContext, ToolResult } from '../../../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createGetAPIEndpointTool(): ToolDefinition {
  return {
    name: 'get_api_endpoint',
    description: 'Get API endpoint configuration from the backend repository',
    inputSchema: {
      type: 'object',
      properties: {
        endpoint: {
          type: 'string',
          description: 'Endpoint path (e.g., /api/users)',
        },
      },
      required: ['endpoint'],
    },
    handler: async (args: any, context: ToolContext): Promise<ToolResult> => {
      const { endpoint } = args;
      const { repoPath } = context;

      const possiblePaths = [
        path.join(repoPath, 'src', 'routes'),
        path.join(repoPath, 'src', 'api'),
        path.join(repoPath, 'routes'),
        path.join(repoPath, 'api'),
        path.join(repoPath, 'server', 'routes'),
      ];

      for (const routesPath of possiblePaths) {
        try {
          const endpointInfo = await findEndpoint(routesPath, endpoint);
          if (endpointInfo) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(endpointInfo, null, 2),
              }],
            };
          }
        } catch {
          continue;
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ 
            error: `Endpoint ${endpoint} not found`,
          }, null, 2),
        }],
        isError: true,
      };
    },
  };
}

async function findEndpoint(routesPath: string, endpoint: string): Promise<any | null> {
  try {
    const entries = await fs.readdir(routesPath, { withFileTypes: true });
    const endpointParts = endpoint.split('/').filter(p => p);
    
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        const filePath = path.join(routesPath, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (content.includes(endpoint) || content.includes(endpointParts[endpointParts.length - 1])) {
          return {
            file: filePath,
            endpoint: endpoint,
            found: true,
          };
        }
      } else if (entry.isDirectory()) {
        const subResult = await findEndpoint(
          path.join(routesPath, entry.name),
          endpoint
        );
        if (subResult) {
          return subResult;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}
