import { ToolDefinition, ToolContext, ToolResult } from '../../registry/types.js';

export function createListReposTool(
  getRepos: () => Array<{ name: string; path: string; type: string }>
): ToolDefinition {
  return {
    name: 'list_repos',
    description: 'Lists all discovered repositories with metadata',
    handler: async (args: any, context: ToolContext): Promise<ToolResult> => {
      const repos = getRepos();
      
      const repoList = repos.map(repo => ({
        name: repo.name,
        path: repo.path,
        type: repo.type,
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(repoList, null, 2),
        }],
      };
    },
  };
}
