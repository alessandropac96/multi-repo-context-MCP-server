import { ToolDefinition } from '../../../registry/types.js';
import { createGetContractABITool } from './getContractABI.js';
import { createGetContractAddressTool } from './getContractAddress.js';

export async function loadTools(repoPath: string): Promise<ToolDefinition[]> {
  return [
    createGetContractABITool(),
    createGetContractAddressTool(),
  ];
}
