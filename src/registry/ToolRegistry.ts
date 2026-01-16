import { ToolDefinition } from './types.js';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(name: string, tool: ToolDefinition): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool with name '${name}' is already registered`);
    }
    this.tools.set(name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolsByRepo(repo: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.repo === repo
    );
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  clear(): void {
    this.tools.clear();
  }
}
