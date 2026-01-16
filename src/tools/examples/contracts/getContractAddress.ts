import { ToolDefinition, ToolContext, ToolResult } from '../../../registry/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createGetContractAddressTool(): ToolDefinition {
  return {
    name: 'get_contract_address',
    description: 'Get the deployed address for a contract from deployment artifacts',
    inputSchema: {
      type: 'object',
      properties: {
        contractName: {
          type: 'string',
          description: 'Name of the contract',
        },
        network: {
          type: 'string',
          description: 'Network name (e.g., mainnet, goerli)',
        },
      },
      required: ['contractName'],
    },
    handler: async (args: any, context: ToolContext): Promise<ToolResult> => {
      const { contractName, network } = args;
      const { repoPath } = context;

      const possiblePaths = [
        path.join(repoPath, 'deployments', network || 'localhost', `${contractName}.json`),
        path.join(repoPath, '.openzeppelin', network || 'unknown-*.json'),
        path.join(repoPath, 'broadcast', contractName, network || 'localhost', 'run-latest.json'),
      ];

      for (const deployPath of possiblePaths) {
        try {
          if (deployPath.includes('*')) {
            const dir = path.dirname(deployPath);
            const pattern = path.basename(deployPath);
            const files = await fs.readdir(dir);
            const matchingFile = files.find(f => f.includes(contractName));
            
            if (matchingFile) {
              const content = await fs.readFile(path.join(dir, matchingFile), 'utf-8');
              const data = JSON.parse(content);
              
              if (data.address || data.proxies?.[0]?.address) {
                return {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({ 
                      address: data.address || data.proxies[0].address,
                      network: network || 'unknown',
                    }, null, 2),
                  }],
                };
              }
            }
          } else {
            const content = await fs.readFile(deployPath, 'utf-8');
            const data = JSON.parse(content);
            
            if (data.address) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ 
                    address: data.address,
                    network: network || 'localhost',
                  }, null, 2),
                }],
              };
            }
          }
        } catch {
          continue;
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ 
            error: `Address not found for contract ${contractName}${network ? ` on ${network}` : ''}`,
          }, null, 2),
        }],
        isError: true,
      };
    },
  };
}
