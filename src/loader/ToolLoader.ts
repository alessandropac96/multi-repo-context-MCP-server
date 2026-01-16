import { ToolDefinition, RepoInfo, Logger } from '../registry/types.js';
import { RepoToolLoader } from './RepoToolLoader.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ToolLoader {
  private logger: Logger;
  private repoToolLoader: RepoToolLoader;
  private rootToolsLoaded: boolean = false;
  private getReposFn?: () => Array<{ name: string; path: string; type: string }>;
  private getRepoFn?: (name: string) => { name: string; path: string; type: string } | undefined;
  private getToolsByRepoFn?: (repo: string) => Array<{ name: string; description: string }>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.repoToolLoader = new RepoToolLoader(logger);
  }

  setRootToolCallbacks(
    getRepos: () => Array<{ name: string; path: string; type: string }>,
    getRepo: (name: string) => { name: string; path: string; type: string } | undefined,
    getToolsByRepo: (repo: string) => Array<{ name: string; description: string }>
  ): void {
    this.getReposFn = getRepos;
    this.getRepoFn = getRepo;
    this.getToolsByRepoFn = getToolsByRepo;
  }

  async loadRootTools(): Promise<ToolDefinition[]> {
    if (this.rootToolsLoaded) {
      return [];
    }

    if (!this.getReposFn || !this.getRepoFn || !this.getToolsByRepoFn) {
      this.logger.warn('Root tool callbacks not set, cannot load root tools');
      return [];
    }

    const rootToolsPath = path.join(__dirname, '..', 'tools', 'root', 'index.js');
    
    try {
      const module = await import(rootToolsPath);
      if (module && typeof module.loadRootTools === 'function') {
        const tools = await module.loadRootTools(
          this.getReposFn,
          this.getRepoFn,
          this.getToolsByRepoFn
        );
        this.rootToolsLoaded = true;
        this.logger.info(`Loaded ${tools.length} root tools`);
        return tools;
      }
    } catch (error: any) {
      this.logger.error(`Failed to load root tools: ${error.message}`);
    }

    return [];
  }

  async loadRepoTools(repo: RepoInfo, lazyLoad: boolean = true): Promise<ToolDefinition[]> {
    if (lazyLoad) {
      return this.repoToolLoader.loadToolsForRepo(repo);
    }

    return this.repoToolLoader.loadToolsForRepo(repo);
  }
}
