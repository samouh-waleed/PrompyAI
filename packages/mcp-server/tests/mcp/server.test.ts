import { describe, it, expect } from 'vitest';

describe('MCP Server', () => {
  it('should export both tools with correct names', async () => {
    const tools = await import('../../src/mcp/tools/index.js');
    expect(tools.EVALUATE_PROMPT_TOOL).toBeDefined();
    expect(tools.GET_CONTEXT_TOOL).toBeDefined();
    expect(tools.EVALUATE_PROMPT_TOOL.name).toBe('evaluate_prompt');
    expect(tools.GET_CONTEXT_TOOL.name).toBe('get_context');
  });

  it('should export handler functions', async () => {
    const tools = await import('../../src/mcp/tools/index.js');
    expect(typeof tools.handleEvaluatePrompt).toBe('function');
    expect(typeof tools.handleGetContext).toBe('function');
  });

  it('should have valid input schemas with required fields', async () => {
    const tools = await import('../../src/mcp/tools/index.js');

    // evaluate_prompt schema
    expect(tools.EVALUATE_PROMPT_TOOL.inputSchema.type).toBe('object');
    expect(tools.EVALUATE_PROMPT_TOOL.inputSchema.required).toContain('prompt');
    expect(tools.EVALUATE_PROMPT_TOOL.inputSchema.required).toContain('workspace_path');
    expect(tools.EVALUATE_PROMPT_TOOL.inputSchema.properties).toHaveProperty('prompt');
    expect(tools.EVALUATE_PROMPT_TOOL.inputSchema.properties).toHaveProperty('workspace_path');
    expect(tools.EVALUATE_PROMPT_TOOL.inputSchema.properties).toHaveProperty('active_file');

    // get_context schema
    expect(tools.GET_CONTEXT_TOOL.inputSchema.type).toBe('object');
    expect(tools.GET_CONTEXT_TOOL.inputSchema.required).toContain('workspace_path');
    expect(tools.GET_CONTEXT_TOOL.inputSchema.properties).toHaveProperty('workspace_path');
  });

  it('should have non-empty descriptions', async () => {
    const tools = await import('../../src/mcp/tools/index.js');
    expect(tools.EVALUATE_PROMPT_TOOL.description.length).toBeGreaterThan(10);
    expect(tools.GET_CONTEXT_TOOL.description.length).toBeGreaterThan(10);
  });
});
