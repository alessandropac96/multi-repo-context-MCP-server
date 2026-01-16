export type JSONSchema7 = {
  type?: string | string[];
  properties?: Record<string, JSONSchema7>;
  required?: string[];
  items?: JSONSchema7 | JSONSchema7[];
  description?: string;
  [key: string]: any;
};

export interface RepoInfo {
  name: string;
  path: string;
  type: string;
  tools?: string | string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: JSONSchema7;
  handler: (args: any, context: ToolContext) => Promise<ToolResult>;
  repo?: string;
}

export interface ToolContext {
  repoPath: string;
  repoInfo: RepoInfo;
  logger: Logger;
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface Config {
  repos?: RepoConfig[];
  discovery?: DiscoveryConfig;
  tools?: ToolsConfig;
}

export interface RepoConfig {
  name: string;
  path: string;
  type: string;
  tools?: string | string[];
}

export interface DiscoveryConfig {
  enabled?: boolean;
  parentPath?: string;
  autoDetectType?: boolean;
}

export interface ToolsConfig {
  lazyLoad?: boolean;
  cacheResults?: boolean;
}
