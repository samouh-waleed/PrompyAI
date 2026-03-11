import { describe, it, expect, afterAll } from 'vitest';
import { join } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const PKG_ROOT = join(import.meta.dirname, '..', '..');
const SAMPLE_PROJECT = join(PKG_ROOT, 'tests', 'fixtures', 'sample-project');

/**
 * End-to-end JSON-RPC integration test.
 * Spawns the MCP server as a child process, connects via stdio,
 * and exercises the full protocol: initialize → listTools → callTool.
 */
describe('MCP JSON-RPC Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;

  // Connect once for all tests in this suite
  const ready = (async () => {
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', join(PKG_ROOT, 'src', 'mcp', 'server.ts')],
      env: {
        ...process.env as Record<string, string>,
        // Ensure no real API calls during tests
        ANTHROPIC_API_KEY: '',
      },
      stderr: 'pipe',
    });

    client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} },
    );

    await client.connect(transport);
  })();

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should complete MCP initialization handshake', async () => {
    await ready;
    const caps = client.getServerCapabilities();
    expect(caps).toBeDefined();
    expect(caps?.tools).toBeDefined();

    const info = client.getServerVersion();
    expect(info?.name).toBe('prompyai');
    expect(info?.version).toBe('0.1.0');
  });

  it('should list both tools via tools/list', async () => {
    await ready;
    const result = await client.listTools();

    expect(result.tools).toHaveLength(3);
    const names = result.tools.map((t) => t.name).sort();
    expect(names).toEqual(['evaluate_prompt', 'get_context', 'prompyai_toggle']);

    // Verify schemas
    const evalTool = result.tools.find((t) => t.name === 'evaluate_prompt')!;
    expect(evalTool.inputSchema.required).toContain('prompt');
    expect(evalTool.inputSchema.required).toContain('workspace_path');

    const ctxTool = result.tools.find((t) => t.name === 'get_context')!;
    expect(ctxTool.inputSchema.required).toContain('workspace_path');
  });

  it('should call evaluate_prompt and return ScoreResult', async () => {
    await ready;
    const result = await client.callTool({
      name: 'evaluate_prompt',
      arguments: {
        prompt: 'fix the auth',
        workspace_path: SAMPLE_PROJECT,
      },
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);

    const content = result.content[0];
    expect(content).toHaveProperty('type', 'text');
    const parsed = JSON.parse((content as { text: string }).text);

    // Validate ScoreResult shape
    expect(parsed.total).toBeGreaterThanOrEqual(0);
    expect(parsed.total).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(parsed.grade);
    expect(parsed.dimensions).toHaveProperty('specificity');
    expect(parsed.dimensions).toHaveProperty('context');
    expect(parsed.dimensions).toHaveProperty('clarity');
    expect(parsed.dimensions).toHaveProperty('anchoring');
    expect(Array.isArray(parsed.suggestions)).toBe(true);
    expect(typeof parsed.enhancedPrompt).toBe('string');
    expect(parsed.scoredAt).toBeDefined();
  });

  it('should call get_context and return project context', async () => {
    await ready;
    const result = await client.callTool({
      name: 'get_context',
      arguments: {
        workspace_path: SAMPLE_PROJECT,
      },
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);

    const content = result.content[0];
    expect(content).toHaveProperty('type', 'text');
    const parsed = JSON.parse((content as { text: string }).text);

    // Validate context shape
    expect(parsed.stack.language).toBe('typescript');
    expect(parsed.stack.framework).toBe('nextjs');
    expect(parsed.stack.uiLibrary).toBe('react');
    expect(parsed.stack.orm).toBe('prisma');
    expect(parsed.fileCount).toBeGreaterThan(0);
    expect(Array.isArray(parsed.hotFiles)).toBe(true);
    expect(Array.isArray(parsed.keyFolders)).toBe(true);
  });

  it('should return error response for unknown tool', async () => {
    await ready;
    const result = await client.callTool({
      name: 'nonexistent_tool',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Unknown tool');
  });

  it('should return error response for invalid arguments', async () => {
    await ready;
    const result = await client.callTool({
      name: 'evaluate_prompt',
      arguments: {
        // Missing required 'prompt' field
        workspace_path: SAMPLE_PROJECT,
      },
    });

    expect(result.isError).toBe(true);
  });

  it('should score vague prompt lower than detailed prompt', async () => {
    await ready;

    const vagueResult = await client.callTool({
      name: 'evaluate_prompt',
      arguments: {
        prompt: 'fix it',
        workspace_path: SAMPLE_PROJECT,
      },
    });

    const detailedResult = await client.callTool({
      name: 'evaluate_prompt',
      arguments: {
        prompt: 'In @src/index.ts, the greet function should return "Hello, {name}" but currently returns undefined. Update the function to return the formatted string. It should pass the existing vitest test.',
        workspace_path: SAMPLE_PROJECT,
      },
    });

    const vagueScore = JSON.parse((vagueResult.content[0] as { text: string }).text).total;
    const detailedScore = JSON.parse((detailedResult.content[0] as { text: string }).text).total;

    expect(vagueScore).toBeLessThan(detailedScore);
  });
});
