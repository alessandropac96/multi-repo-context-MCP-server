import { RepoInfo } from './types.js';
import { RepoDiscoverer } from '../discovery/RepoDiscoverer.js';
import { RepoValidator } from '../discovery/RepoValidator.js';
import { ConfigLoader } from '../config/ConfigLoader.js';
import { Logger } from './types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RepoRegistry {
  private repos: Map<string, RepoInfo> = new Map();
  private discoverer: RepoDiscoverer;
  private validator: RepoValidator;
  private configLoader: ConfigLoader;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.discoverer = new RepoDiscoverer(logger);
    this.validator = new RepoValidator(logger);
    this.configLoader = new ConfigLoader(logger);
  }

  async discoverRepos(): Promise<void> {
    this.logger.info('Starting repository discovery...');
    this.repos.clear();

    const config = await this.configLoader.load();
    const discoveredRepos: RepoInfo[] = [];

    if (config.repos && config.repos.length > 0) {
      this.logger.info(`Found ${config.repos.length} repos in configuration`);
      for (const repoConfig of config.repos) {
        const repoInfo: RepoInfo = {
          name: repoConfig.name,
          path: path.resolve(repoConfig.path),
          type: repoConfig.type,
          tools: repoConfig.tools,
        };
        if (await this.validator.validateRepo(repoInfo)) {
          discoveredRepos.push(repoInfo);
        }
      }
    }

    if (config.discovery?.enabled) {
      const autoDiscovered = await this.discoverer.discover(
        config.discovery.parentPath,
        config.discovery.autoDetectType ?? true
      );
      discoveredRepos.push(...autoDiscovered);
    }

    const envReposPath = process.env.MULTI_REPO_MCP_REPOS_PATH;
    if (envReposPath) {
      this.logger.info(`Checking environment variable repos path: ${envReposPath}`);
      try {
        const envRepos = await this.discoverer.discover(
          envReposPath,
          true
        );
        discoveredRepos.push(...envRepos);
      } catch (error) {
        this.logger.warn(`Failed to discover repos from env path: ${error}`);
      }
    }

    const workspacePath = process.cwd();
    if (workspacePath && workspacePath !== __dirname) {
      this.logger.info(`Checking workspace context: ${workspacePath}`);
      try {
        const workspaceRepos = await this.discoverer.discover(
          workspacePath,
          true
        );
        discoveredRepos.push(...workspaceRepos);
      } catch (error) {
        this.logger.warn(`Failed to discover repos from workspace: ${error}`);
      }
    }

    for (const repo of discoveredRepos) {
      if (!this.repos.has(repo.name)) {
        this.repos.set(repo.name, repo);
        this.logger.info(`Registered repo: ${repo.name} (${repo.type}) at ${repo.path}`);
      } else {
        this.logger.warn(`Skipping duplicate repo: ${repo.name}`);
      }
    }

    this.logger.info(`Discovery complete. Found ${this.repos.size} repositories.`);
  }

  listRepos(): RepoInfo[] {
    return Array.from(this.repos.values());
  }

  getRepo(name: string): RepoInfo | undefined {
    return this.repos.get(name);
  }

  async validateRepo(repo: RepoInfo): Promise<boolean> {
    return this.validator.validateRepo(repo);
  }

  hasRepo(name: string): boolean {
    return this.repos.has(name);
  }
}
