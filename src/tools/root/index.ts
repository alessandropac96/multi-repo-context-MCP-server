import { ToolDefinition } from '../../registry/types.js';
import { createListReposTool } from './listRepos.js';
import { createSearchAcrossReposTool } from './searchAcrossRepos.js';
import { createGetRepoInfoTool } from './getRepoInfo.js';

export async function loadRootTools(
  getRepos: () => Array<{ name: string; path: string; type: string }>,
  getRepo: (name: string) => { name: string; path: string; type: string } | undefined,
  getToolsByRepo: (repo: string) => Array<{ name: string; description: string }>
): Promise<ToolDefinition[]> {
  return [
    createListReposTool(getRepos),
    createSearchAcrossReposTool(getRepos, getToolsByRepo),
    createGetRepoInfoTool(getRepo, getToolsByRepo),
  ];
}
