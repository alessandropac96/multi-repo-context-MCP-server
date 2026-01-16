import { ToolDefinition } from '../../../registry/types.js';
import { createGetAPIEndpointTool } from './getAPIEndpoint.js';

export async function loadTools(repoPath: string): Promise<ToolDefinition[]> {
  return [
    createGetAPIEndpointTool(),
  ];
}
