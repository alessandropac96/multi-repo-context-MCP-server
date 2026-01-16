import { ToolDefinition, ToolContext, ToolResult } from '../../src/registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createExampleTool(): ToolDefinition {
  return {
    name: 'example_tool',
    description: 'An example tool that demonstrates the tool definition pattern',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Input string to process',
        },
      },
      required: ['input'],
    },
    handler: async (args: any, context: ToolContext): Promise<ToolResult> => {
      const { input } = args;
      const { repoPath, repoInfo, logger } = context;

      logger.info(`Processing input: ${input} for repo ${repoInfo.name}`);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            result: `Processed: ${input}`,
            repo: repoInfo.name,
            type: repoInfo.type,
          }, null, 2),
        }],
      };
    },
  };
}
