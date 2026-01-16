import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from './registry/ToolRegistry.js';
import { RepoRegistry } from './registry/RepoRegistry.js';
import { ToolLoader } from './loader/ToolLoader.js';
import { ConfigLoader } from './config/ConfigLoader.js';
import { ToolDefinition, Logger, ToolContext } from './registry/types.js';

export class MCPServer {
  private server: McpServer;
  private toolRegistry: ToolRegistry;
  private repoRegistry: RepoRegistry;
  private toolLoader: ToolLoader;
  private configLoader: ConfigLoader;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.server = new McpServer(
      {
        name: 'multi-repo-context-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.toolRegistry = new ToolRegistry();
    this.configLoader = new ConfigLoader(logger);
    this.repoRegistry = new RepoRegistry(logger);
    this.toolLoader = new ToolLoader(logger);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.getAllTools();
      return {
        tools: tools.map(tool => ({
          name: tool.repo ? `${tool.repo}:${tool.name}` : tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema || {},
        })),
      };
    });

    this.server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      let tool: ToolDefinition | undefined;
      let repoName: string | undefined;

      if (name.includes(':')) {
        const [repo, toolName] = name.split(':', 2);
        repoName = repo;
        tool = this.toolRegistry.getTool(`${repo}:${toolName}`);
        
        if (!tool) {
          await this.loadRepoToolsIfNeeded(repo);
          tool = this.toolRegistry.getTool(`${repo}:${toolName}`);
        }
      } else {
        tool = this.toolRegistry.getTool(name);
      }

      if (!tool) {
        throw new Error(`Tool '${name}' not found`);
      }

      const repo = repoName ? this.repoRegistry.getRepo(repoName) : undefined;
      const repoPath = repo?.path || process.cwd();

      const context: ToolContext = {
        repoPath,
        repoInfo: repo || { name: 'root', path: repoPath, type: 'unknown' },
        logger: this.logger,
      };

      try {
        const result = await tool.handler(args || {}, context);
        return {
          content: result.content,
          isError: result.isError || false,
        };
      } catch (error: any) {
        this.logger.error(`Tool execution error: ${error.message}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          }],
          isError: true,
        };
      }
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing MCP server...');

    await this.repoRegistry.discoverRepos();

    this.toolLoader.setRootToolCallbacks(
      () => this.getRepos(),
      (name: string) => this.getRepo(name),
      (repo: string) => this.getToolsByRepo(repo)
    );

    const rootTools = await this.toolLoader.loadRootTools();
    for (const tool of rootTools) {
      this.toolRegistry.register(tool.name, tool);
    }

    const repos = this.repoRegistry.listRepos();
    const config = await this.configLoader.load();
    const lazyLoad = config.tools?.lazyLoad ?? true;

    if (!lazyLoad) {
      for (const repo of repos) {
        await this.loadRepoToolsIfNeeded(repo.name);
      }
    }

    this.logger.info(`Server initialized with ${this.toolRegistry.getAllTools().length} tools`);
  }

  private async loadRepoToolsIfNeeded(repoName: string): Promise<void> {
    const repo = this.repoRegistry.getRepo(repoName);
    if (!repo) {
      return;
    }

    const existingTools = this.toolRegistry.getToolsByRepo(repoName);
    if (existingTools.length > 0) {
      return;
    }

    try {
      const config = await this.configLoader.load();
      const lazyLoad = config.tools?.lazyLoad ?? true;
      
      const tools = await this.toolLoader.loadRepoTools(repo, lazyLoad);
      
      for (const tool of tools) {
        const fullName = `${repoName}:${tool.name}`;
        this.toolRegistry.register(fullName, tool);
      }

      this.logger.info(`Loaded ${tools.length} tools for repo ${repoName}`);
    } catch (error: any) {
      this.logger.warn(`Failed to load tools for repo ${repoName}: ${error.message}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('MCP server running on stdio');
  }

  getRepos() {
    return this.repoRegistry.listRepos();
  }

  getRepo(name: string) {
    return this.repoRegistry.getRepo(name);
  }

  getToolsByRepo(repo: string) {
    return this.toolRegistry.getToolsByRepo(repo);
  }
}
