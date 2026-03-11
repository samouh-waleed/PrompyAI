import { describe, it, expect } from 'vitest';
import { WorkspaceIndexer } from '../../src/indexer/WorkspaceIndexer.js';
import { resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('WorkspaceIndexer', () => {
  const fixturePath = resolve(__dirname, '../fixtures/sample-project');

  it('should return a complete ProjectFingerprint', async () => {
    const indexer = new WorkspaceIndexer();
    const fp = await indexer.getFingerprint(fixturePath);

    expect(fp.workspacePath).toBe(fixturePath);
    expect(fp.stack.runtime).toBe('node');
    expect(fp.stack.framework).toBe('nextjs');
    expect(fp.fileTree.length).toBeGreaterThan(0);
    expect(fp.lastIndexed).toBeInstanceOf(Date);
    expect(Array.isArray(fp.hotFiles)).toBe(true);
    expect(Array.isArray(fp.keyFolders)).toBe(true);
    expect(Array.isArray(fp.conventionHints)).toBe(true);
    expect(typeof fp.aiInstructions).toBe('string');
    expect(typeof fp.readmeSummary).toBe('string');
  });

  it('should extract key folders from file tree', async () => {
    const indexer = new WorkspaceIndexer();
    const fp = await indexer.getFingerprint(fixturePath);
    expect(fp.keyFolders).toContain('src');
  });

  it('should derive convention hints from stack', async () => {
    const indexer = new WorkspaceIndexer();
    const fp = await indexer.getFingerprint(fixturePath);
    expect(fp.conventionHints).toContain('Framework: nextjs');
    expect(fp.conventionHints).toContain('ORM: prisma');
    expect(fp.conventionHints).toContain('TypeScript strict mode');
  });

  it('should cache subsequent calls for the same workspace', async () => {
    const indexer = new WorkspaceIndexer();
    const first = await indexer.getFingerprint(fixturePath);
    const second = await indexer.getFingerprint(fixturePath);
    expect(first.lastIndexed).toEqual(second.lastIndexed);
  });

  it('should handle no git repo gracefully', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      const indexer = new WorkspaceIndexer();
      const fp = await indexer.getFingerprint(tmpDir);
      expect(fp.hotFiles).toEqual([]);
      expect(fp.indexingErrors).toContain('No git repository found — hotFiles unavailable');
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  it('should handle empty projects', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      const indexer = new WorkspaceIndexer();
      const fp = await indexer.getFingerprint(tmpDir);
      expect(fp.stack.runtime).toBe('unknown');
      expect(fp.fileTree).toEqual([]);
      expect(fp.readmeSummary).toBe('');
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });
});
