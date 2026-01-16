import { ToolDefinition } from '../../src/registry/types.js';

export async function loadTools(repoPath: string): Promise<ToolDefinition[]> {
  return [
    {
      name: 'example_tool',
      description: 'An example tool for this repository',
      inputSchema: {
        type: 'object',
        properties: {
          param: {
            type: 'string',
            description: 'Example parameter',
          },
        },
        required: ['param'],
      },
      handler: async (args: any, context) => {
        const { param } = args;
        const { repoPath, repoInfo, logger } = context;

        logger.info(`Example tool called with param: ${param}`);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: `Example tool executed in ${repoInfo.name}`,
              param,
              repoPath,
            }, null, 2),
          }],
        };
      },
    },
  ];
}
