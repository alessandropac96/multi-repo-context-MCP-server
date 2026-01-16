import { ToolDefinition, RepoInfo, ToolContext, Logger } from '../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RepoToolLoader {
  private logger: Logger;
  private loadedModules: Map<string, any> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async loadToolsForRepo(repo: RepoInfo): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];

    if (repo.tools === 'builtin' || !repo.tools) {
      const builtinTools = await this.loadBuiltinTools(repo);
      tools.push(...builtinTools);
    } else if (repo.tools === 'custom') {
      const customTools = await this.loadCustomTools(repo);
      tools.push(...customTools);
    } else if (typeof repo.tools === 'string') {
      const pathTools = await this.loadToolsFromPath(repo, repo.tools);
      tools.push(...pathTools);
    } else if (Array.isArray(repo.tools)) {
      for (const toolSource of repo.tools) {
        if (toolSource === 'builtin') {
          const builtinTools = await this.loadBuiltinTools(repo);
          tools.push(...builtinTools);
        } else if (toolSource === 'custom') {
          const customTools = await this.loadCustomTools(repo);
          tools.push(...customTools);
        } else {
          const pathTools = await this.loadToolsFromPath(repo, toolSource);
          tools.push(...pathTools);
        }
      }
    }

    if (tools.length === 0) {
      this.logger.warn(`No tools found for repo ${repo.name}, using fallback`);
      return this.getFallbackTools(repo);
    }

    return tools.map(tool => ({
      ...tool,
      repo: repo.name,
    }));
  }

  private async loadBuiltinTools(repo: RepoInfo): Promise<ToolDefinition[]> {
    const builtinPath = path.join(__dirname, '..', 'tools', 'examples', repo.type, 'index.js');
    
    try {
      const module = await this.loadModule(builtinPath);
      if (module && typeof module.loadTools === 'function') {
        return await module.loadTools(repo.path);
      }
    } catch (error: any) {
      this.logger.debug(`Failed to load builtin tools for ${repo.type}: ${error.message}`);
    }

    return [];
  }

  private async loadCustomTools(repo: RepoInfo): Promise<ToolDefinition[]> {
    const customPaths = [
      path.join(__dirname, '..', 'tools', 'custom', repo.name, 'index.js'),
      path.join(__dirname, '..', 'tools', 'custom', repo.name, 'index.ts'),
      path.join(__dirname, '..', 'tools', 'custom', repo.type, 'index.js'),
      path.join(__dirname, '..', 'tools', 'custom', repo.type, 'index.ts'),
    ];

    for (const customPath of customPaths) {
      try {
        const module = await this.loadModule(customPath);
        
        if (module && typeof module.loadTools === 'function') {
          const tools = await module.loadTools(repo.path);
          this.logger.info(`Loaded ${tools.length} custom tools from ${customPath}`);
          return tools;
        } else if (module && module.tools && Array.isArray(module.tools)) {
          this.logger.info(`Loaded ${module.tools.length} custom tools from ${customPath}`);
          return module.tools;
        }
      } catch (error: any) {
        if (error.code !== 'ERR_MODULE_NOT_FOUND') {
          this.logger.debug(`Failed to load custom tools from ${customPath}: ${error.message}`);
        }
        continue;
      }
    }

    this.logger.debug(`No custom tools found for ${repo.name} (checked repo name and type)`);
    return [];
  }

  private async loadToolsFromPath(repo: RepoInfo, toolPath: string): Promise<ToolDefinition[]> {
    const fullPath = path.isAbsolute(toolPath)
      ? toolPath
      : path.join(repo.path, toolPath);
    
    try {
      const module = await this.loadModule(fullPath);
      if (module && typeof module.loadTools === 'function') {
        return await module.loadTools(repo.path);
      } else if (module && module.tools && Array.isArray(module.tools)) {
        return module.tools;
      }
    } catch (error: any) {
      this.logger.warn(`Failed to load tools from path ${toolPath}: ${error.message}`);
    }

    return [];
  }

  private async loadModule(modulePath: string): Promise<any> {
    if (this.loadedModules.has(modulePath)) {
      return this.loadedModules.get(modulePath);
    }

    try {
      const module = await import(modulePath);
      this.loadedModules.set(modulePath, module);
      return module;
    } catch (error: any) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(`Module not found: ${modulePath}`);
      }
      throw error;
    }
  }

  private getFallbackTools(repo: RepoInfo): ToolDefinition[] {
    return [
      {
        name: 'list_files',
        description: `List files in ${repo.name} repository`,
        handler: async (args: any, context: ToolContext) => {
          const { repoPath } = context;
          const dir = args.directory || repoPath;
          const files = await fs.readdir(dir, { withFileTypes: true });
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(files.map(f => ({
                name: f.name,
                type: f.isDirectory() ? 'directory' : 'file',
              })), null, 2),
            }],
          };
        },
      },
    ];
  }
}
