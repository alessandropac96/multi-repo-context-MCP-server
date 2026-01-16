import { Config } from '../registry/types.js';
import { defaultConfig } from './defaults.js';
import { Logger } from '../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigLoader {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async load(): Promise<Config> {
    const configSources = [
      () => this.loadFromPath('.multi-repo-mcp/repos.json'),
      () => this.loadFromPath(path.join(os.homedir(), '.multi-repo-mcp', 'repos.json')),
      () => this.loadFromEnv(),
      () => Promise.resolve(defaultConfig),
    ];

    for (const source of configSources) {
      try {
        const config = await source();
        if (config) {
          this.logger.info('Configuration loaded successfully');
          return this.mergeConfig(defaultConfig, config);
        }
      } catch (error) {
        this.logger.debug(`Config source failed: ${error}`);
      }
    }

    this.logger.info('Using default configuration');
    return defaultConfig;
  }

  private async loadFromPath(configPath: string): Promise<Config | null> {
    try {
      const fullPath = path.isAbsolute(configPath)
        ? configPath
        : path.resolve(process.cwd(), configPath);
      
      const content = await fs.readFile(fullPath, 'utf-8');
      const config = JSON.parse(content) as Config;
      this.logger.info(`Loaded config from: ${fullPath}`);
      return config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async loadFromEnv(): Promise<Config | null> {
    const envConfigPath = process.env.MULTI_REPO_MCP_CONFIG;
    if (!envConfigPath) {
      return null;
    }

    try {
      const content = await fs.readFile(envConfigPath, 'utf-8');
      const config = JSON.parse(content) as Config;
      this.logger.info(`Loaded config from environment: ${envConfigPath}`);
      return config;
    } catch (error: any) {
      this.logger.warn(`Failed to load config from env: ${error.message}`);
      return null;
    }
  }

  private mergeConfig(defaults: Config, user: Config): Config {
    return {
      repos: user.repos ?? defaults.repos,
      discovery: {
        ...defaults.discovery,
        ...user.discovery,
      },
      tools: {
        ...defaults.tools,
        ...user.tools,
      },
    };
  }
}
