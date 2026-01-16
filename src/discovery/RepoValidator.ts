import { RepoInfo } from '../registry/types.js';
import { Logger } from '../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class RepoValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async validateRepo(repo: RepoInfo): Promise<boolean> {
    try {
      const resolvedPath = path.resolve(repo.path);
      
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        this.logger.warn(`Repo path is not a directory: ${resolvedPath}`);
        return false;
      }

      await fs.access(resolvedPath, fs.constants.R_OK);
      
      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to validate repo ${repo.name}: ${error.message}`);
      return false;
    }
  }
}
