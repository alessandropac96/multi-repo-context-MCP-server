import { ToolDefinition, ToolContext, ToolResult } from '../../../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createGetContractABITool(): ToolDefinition {
  return {
    name: 'get_contract_abi',
    description: 'Get the ABI for a specific contract',
    inputSchema: {
      type: 'object',
      properties: {
        contractName: {
          type: 'string',
          description: 'Name of the contract (e.g., MyContract)',
        },
      },
      required: ['contractName'],
    },
    handler: async (args: any, context: ToolContext): Promise<ToolResult> => {
      const { contractName } = args;
      const { repoPath } = context;

      const possiblePaths = [
        path.join(repoPath, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`),
        path.join(repoPath, 'out', `${contractName}.sol`, `${contractName}.json`),
        path.join(repoPath, 'build', 'contracts', `${contractName}.json`),
      ];

      for (const abiPath of possiblePaths) {
        try {
          const content = await fs.readFile(abiPath, 'utf-8');
          const artifact = JSON.parse(content);
          
          if (artifact.abi) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ abi: artifact.abi }, null, 2),
              }],
            };
          }
        } catch {
          continue;
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `ABI not found for contract ${contractName}` }, null, 2),
        }],
        isError: true,
      };
    },
  };
}
