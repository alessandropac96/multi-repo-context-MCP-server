import { ToolDefinition, ToolContext, ToolResult } from '../../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createSearchAcrossReposTool(
  getRepos: () => Array<{ name: string; path: string }>,
  getToolsByRepo: (repo: string) => Array<{ name: string }>
): ToolDefinition {
  return {
    name: 'search_across_repos',
    description: 'Search across all repositories using file system search',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (searches in file names and content)',
        },
        repoFilter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Limit search to specific repos',
        },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Filter by file extensions (e.g., ["ts", "js"])',
        },
      },
      required: ['query'],
    },
    handler: async (args: any, context: ToolContext): Promise<ToolResult> => {
      const { query, repoFilter, fileTypes } = args;
      const repos = getRepos();
      
      const filteredRepos = repoFilter
        ? repos.filter(r => repoFilter.includes(r.name))
        : repos;

      const results: Record<string, any[]> = {};

      for (const repo of filteredRepos) {
        const repoResults = await searchInDirectory(repo.path, query, fileTypes);
        if (repoResults.length > 0) {
          results[repo.name] = repoResults;
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2),
        }],
      };
    },
  };
}

async function searchInDirectory(
  dirPath: string,
  query: string,
  fileTypes?: string[]
): Promise<Array<{ file: string; matches: number }>> {
  const results: Array<{ file: string; matches: number }> = [];
  const queryLower = query.toLowerCase();

  try {
    await searchRecursive(dirPath, queryLower, fileTypes, results);
  } catch (error) {
    return results;
  }

  return results;
}

async function searchRecursive(
  dirPath: string,
  query: string,
  fileTypes: string[] | undefined,
  results: Array<{ file: string; matches: number }>,
  visited: Set<string> = new Set()
): Promise<void> {
  if (visited.has(dirPath)) {
    return;
  }
  visited.add(dirPath);

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        await searchRecursive(fullPath, query, fileTypes, results, visited);
      } else if (entry.isFile()) {
        if (fileTypes) {
          const ext = path.extname(entry.name).slice(1);
          if (!fileTypes.includes(ext)) {
            continue;
          }
        }

        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const matches = (content.toLowerCase().match(new RegExp(query, 'g')) || []).length;
          
          if (entry.name.toLowerCase().includes(query) || matches > 0) {
            results.push({
              file: fullPath,
              matches: matches + (entry.name.toLowerCase().includes(query) ? 1 : 0),
            });
          }
        } catch {
          continue;
        }
      }
    }
  } catch (error) {
    return;
  }
}
