# Repository Tool Module Template

This template helps you create a new repository tool module for the Multi-Repo Context MCP Server.

## Structure

A repository tool module should be placed in `src/tools/examples/{repo-type}/` and export a `loadTools` function.

## Files

- `index.ts` - Main entry point that exports the `loadTools` function
- `exampleTool.ts` - Example tool implementation showing the pattern

## Usage

1. Copy this template to `src/tools/examples/{your-repo-type}/`
2. Rename `exampleTool.ts` to match your tool name
3. Implement your tools following the `ToolDefinition` interface
4. Export them from `index.ts` using the `loadTools` function

## Tool Definition Pattern

Each tool must implement the `ToolDefinition` interface:

```typescript
{
  name: string;                    // Tool name (without namespace)
  description: string;             // Human-readable description
  inputSchema?: JSONSchema;         // JSON Schema for input validation
  handler: (args: any, context: ToolContext) => Promise<ToolResult>
}
```

## Example

See `src/tools/examples/contracts/` or `src/tools/examples/backend/` for complete examples.
