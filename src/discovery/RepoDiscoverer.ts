import { RepoInfo } from '../registry/types.js';
import { Logger } from '../registry/types.js';
import { RepoTypeDetector } from './RepoTypeDetector.js';
import { RepoValidator } from './RepoValidator.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class RepoDiscoverer {
  private logger: Logger;
  private typeDetector: RepoTypeDetector;
  private validator: RepoValidator;

  constructor(logger: Logger) {
    this.logger = logger;
    this.typeDetector = new RepoTypeDetector();
    this.validator = new RepoValidator(logger);
  }

  async discover(parentPath?: string, autoDetectType: boolean = true): Promise<RepoInfo[]> {
    const repos: RepoInfo[] = [];
    const searchPath = parentPath || process.cwd();

    try {
      const entries = await fs.readdir(searchPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const repoPath = path.join(searchPath, entry.name);
        
        if (await this.isValidRepo(repoPath)) {
          const repoType = autoDetectType
            ? await this.typeDetector.detectType(repoPath)
            : 'unknown';

          const repoInfo: RepoInfo = {
            name: entry.name,
            path: repoPath,
            type: repoType,
          };

          if (await this.validator.validateRepo(repoInfo)) {
            repos.push(repoInfo);
            this.logger.debug(`Discovered repo: ${entry.name} (${repoType})`);
          }
        }
      }
    } catch (error: any) {
      this.logger.warn(`Failed to discover repos in ${searchPath}: ${error.message}`);
    }

    return repos;
  }

  private async isValidRepo(repoPath: string): Promise<boolean> {
    const indicators = [
      '.git',
      'package.json',
      'foundry.toml',
      'hardhat.config.js',
      'hardhat.config.ts',
      'truffle-config.js',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
    ];

    for (const indicator of indicators) {
      const indicatorPath = path.join(repoPath, indicator);
      try {
        await fs.access(indicatorPath);
        return true;
      } catch {
        continue;
      }
    }

    return false;
  }
}
