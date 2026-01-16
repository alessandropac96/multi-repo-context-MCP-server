import * as fs from 'fs/promises';
import * as path from 'path';

export class RepoTypeDetector {
  async detectType(repoPath: string): Promise<string> {
    const checks = [
      { type: 'contracts', patterns: ['foundry.toml', 'hardhat.config.*', 'truffle-config.*'] },
      { type: 'backend', patterns: ['package.json'], checkContent: this.isBackendPackage },
      { type: 'frontend', patterns: ['package.json'], checkContent: this.isFrontendPackage },
      { type: 'infrastructure', patterns: ['terraform/', 'cdk.json', 'serverless.yml'] },
    ];

    for (const check of checks) {
      for (const pattern of check.patterns) {
        const fullPath = path.join(repoPath, pattern);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isFile() || stats.isDirectory()) {
            if (check.checkContent) {
              const matches = await check.checkContent(fullPath);
              if (matches) {
                return check.type;
              }
            } else {
              return check.type;
            }
          }
        } catch {
          continue;
        }
      }
    }

    return 'unknown';
  }

  private async isBackendPackage(packagePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const backendFrameworks = [
        'express', 'fastify', 'koa', 'nestjs', 'next', 'nuxt',
        'hapi', 'restify', 'sails', 'loopback', 'feathers'
      ];
      
      return backendFrameworks.some(framework => deps[framework]);
    } catch {
      return false;
    }
  }

  private async isFrontendPackage(packagePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const frontendFrameworks = [
        'react', 'vue', 'angular', 'svelte', 'preact',
        'next', 'nuxt', 'gatsby', 'remix', 'sveltekit'
      ];
      
      return frontendFrameworks.some(framework => deps[framework]);
    } catch {
      return false;
    }
  }
}
