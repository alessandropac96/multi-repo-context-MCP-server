import { ToolDefinition, ToolContext, ToolResult } from '../../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createGetRepoInfoTool(
  getRepo: (name: string) => { name: string; path: string; type: string } | undefined,
  getToolsByRepo: (repo: string) => Array<{ name: string; description: string }>
): ToolDefinition {
  return {
    name: 'get_repo_info',
    description: 'Get detailed information about a specific repository',
    inputSchema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository name',
        },
      },
      required: ['repo'],
    },
    handler: async (args: any, context: ToolContext): Promise<ToolResult> => {
      const { repo: repoName } = args;
      const repo = getRepo(repoName);
      
      if (!repo) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: `Repository '${repoName}' not found` }, null, 2),
          }],
          isError: true,
        };
      }

      const tools = getToolsByRepo(repoName);
      const fileStructure = await getFileStructure(repo.path);

      const info = {
        name: repo.name,
        path: repo.path,
        type: repo.type,
        tools: tools.map(t => ({ name: t.name, description: t.description })),
        fileStructure: fileStructure,
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(info, null, 2),
        }],
      };
    },
  };
}

async function getFileStructure(repoPath: string, maxDepth: number = 2): Promise<any> {
  const structure: any = {};
  
  try {
    await buildStructure(repoPath, structure, 0, maxDepth);
  } catch (error) {
    return { error: 'Failed to read file structure' };
  }

  return structure;
}

async function buildStructure(
  dirPath: string,
  structure: any,
  currentDepth: number,
  maxDepth: number
): Promise<void> {
  if (currentDepth >= maxDepth) {
    return;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        structure[entry.name] = {};
        await buildStructure(fullPath, structure[entry.name], currentDepth + 1, maxDepth);
      } else {
        structure[entry.name] = 'file';
      }
    }
  } catch {
    return;
  }
}
