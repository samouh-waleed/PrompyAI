import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';

const PKG_ROOT = join(import.meta.dirname, '..', '..');

/**
 * Validates that PrompyAI can be configured and invoked as a Claude CLI MCP server.
 *
 * Claude CLI invokes MCP servers via:
 *   claude mcp add prompyai -- npx prompyai-mcp
 * or in claude_desktop_config.json:
 *   { "mcpServers": { "prompyai": { "command": "npx", "args": ["prompyai-mcp"] } } }
 *
 * These tests verify the entry points exist, the server starts and responds
 * to MCP protocol messages, and the CLI handles known commands.
 */
describe('Claude CLI Configuration', () => {
  it('should have a valid bin entry point in package.json', async () => {
    const pkg = await import(join(PKG_ROOT, 'package.json'), { with: { type: 'json' } });
    expect(pkg.default.bin).toBeDefined();
    expect(pkg.default.bin.prompyai).toBe('./dist/cli.js');
  });

  it('should have the CLI source file', () => {
    expect(existsSync(join(PKG_ROOT, 'src', 'cli.ts'))).toBe(true);
  });

  it('should have the MCP server source file', () => {
    expect(existsSync(join(PKG_ROOT, 'src', 'mcp', 'server.ts'))).toBe(true);
  });

  it('should start server process and exit cleanly on stdin close', async () => {
    const child = spawn('npx', ['tsx', join(PKG_ROOT, 'src', 'cli.ts'), 'serve'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ANTHROPIC_API_KEY: '' },
    });

    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Wait for server to start (it logs to stderr)
    await new Promise<void>((resolve) => {
      const check = () => {
        if (stderr.includes('PrompyAI MCP server started')) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      // Timeout after 5s
      setTimeout(() => resolve(), 5000);
      check();
    });

    expect(stderr).toContain('PrompyAI MCP server started');

    // Close stdin to signal shutdown
    child.stdin?.end();

    // Wait for process to exit
    const exitCode = await new Promise<number | null>((resolve) => {
      child.on('exit', (code) => resolve(code));
      setTimeout(() => {
        child.kill();
        resolve(null);
      }, 3000);
    });

    // Server should exit cleanly (0 or null from signal)
    expect(exitCode === 0 || exitCode === null).toBe(true);
  });

  it('should exit with error for unknown CLI command', async () => {
    const child = spawn('npx', ['tsx', join(PKG_ROOT, 'src', 'cli.ts'), 'unknown-command'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      child.on('exit', (code) => resolve(code));
      setTimeout(() => {
        child.kill();
        resolve(null);
      }, 5000);
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain('Unknown command');
    expect(stderr).toContain('Usage:');
  });

  it('should run doctor command via CLI entry point', async () => {
    const child = spawn(
      'npx',
      ['tsx', join(PKG_ROOT, 'src', 'cli.ts'), 'doctor', '--workspace', join(PKG_ROOT, 'tests', 'fixtures', 'sample-project')],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ANTHROPIC_API_KEY: '' },
      },
    );

    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    await new Promise<void>((resolve) => {
      child.on('exit', () => resolve());
      setTimeout(() => {
        child.kill();
        resolve();
      }, 5000);
    });

    expect(stderr).toContain('PrompyAI Doctor');
    expect(stderr).toContain('Node.js version');
    expect(stderr).toContain('Workspace path exists');
    expect(stderr).toContain('Project manifest found');
  });

  it('should have correct MCP server metadata', async () => {
    // Verify the server identifies itself correctly for Claude CLI
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', join(PKG_ROOT, 'src', 'mcp', 'server.ts')],
      env: { ...process.env as Record<string, string>, ANTHROPIC_API_KEY: '' },
      stderr: 'pipe',
    });

    const client = new Client(
      { name: 'claude-cli-test', version: '1.0.0' },
      { capabilities: {} },
    );

    await client.connect(transport);

    const info = client.getServerVersion();
    expect(info?.name).toBe('prompyai');
    expect(info?.version).toMatch(/^\d+\.\d+\.\d+$/);

    const caps = client.getServerCapabilities();
    expect(caps?.tools).toBeDefined();

    const tools = await client.listTools();
    expect(tools.tools.length).toBe(3);

    // Verify tool names match what Claude CLI would discover
    const toolNames = tools.tools.map((t) => t.name).sort();
    expect(toolNames).toEqual(['evaluate_prompt', 'get_context', 'prompyai_toggle']);

    // Verify each tool has a description (Claude CLI shows these)
    for (const tool of tools.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description!.length).toBeGreaterThan(10);
    }

    await client.close();
  });
});
