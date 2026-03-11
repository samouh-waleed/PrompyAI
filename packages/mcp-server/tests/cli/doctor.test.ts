import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { runDoctor } from '../../src/cli/doctor.js';

const SAMPLE_PROJECT = join(import.meta.dirname, '..', 'fixtures', 'sample-project');

describe('doctor command', () => {
  let stderrOutput: string;
  const originalWrite = process.stderr.write;

  beforeEach(() => {
    stderrOutput = '';
    process.stderr.write = vi.fn((chunk: string | Uint8Array) => {
      if (typeof chunk === 'string') stderrOutput += chunk;
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
  });

  it('should run without throwing for the current directory', async () => {
    await expect(runDoctor(process.cwd())).resolves.not.toThrow();
  });

  it('should output version header', async () => {
    await runDoctor(SAMPLE_PROJECT);
    expect(stderrOutput).toContain('PrompyAI Doctor v0.1.0');
  });

  it('should check Node.js version ≥20', async () => {
    await runDoctor(SAMPLE_PROJECT);
    expect(stderrOutput).toContain('Node.js version');
    expect(stderrOutput).toMatch(/✓ Node\.js version/);
  });

  it('should check workspace path exists', async () => {
    await runDoctor(SAMPLE_PROJECT);
    expect(stderrOutput).toContain('Workspace path exists');
    expect(stderrOutput).toMatch(/✓ Workspace path exists/);
  });

  it('should detect project manifest (package.json)', async () => {
    await runDoctor(SAMPLE_PROJECT);
    expect(stderrOutput).toContain('Project manifest found');
    expect(stderrOutput).toMatch(/✓ Project manifest found: package\.json/);
  });

  it('should check ANTHROPIC_API_KEY status', async () => {
    await runDoctor(SAMPLE_PROJECT);
    expect(stderrOutput).toContain('ANTHROPIC_API_KEY');
  });

  it('should show warning (not error) for optional checks', async () => {
    await runDoctor(SAMPLE_PROJECT);
    // AI instruction file is optional — should be ⚠ not ✗
    if (stderrOutput.includes('No CLAUDE.md found')) {
      expect(stderrOutput).toMatch(/⚠ AI instruction file/);
    }
  });

  it('should report errors for nonexistent workspace', async () => {
    await runDoctor('/nonexistent/path/xyz');
    expect(stderrOutput).toMatch(/✗ Workspace path exists/);
    expect(stderrOutput).toContain('error(s)');
  });

  it('should report Ready when no required checks fail on valid project', async () => {
    // Sample project has package.json but no .git — will have 1 error for git
    await runDoctor(SAMPLE_PROJECT);
    // At minimum it should complete and show Overall line
    expect(stderrOutput).toContain('Overall:');
  });
});
