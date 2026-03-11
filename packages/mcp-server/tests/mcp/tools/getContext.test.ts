import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { GET_CONTEXT_TOOL, handleGetContext } from '../../../src/mcp/tools/getContext.js';
import { WorkspaceIndexer } from '../../../src/indexer/WorkspaceIndexer.js';

const FIXTURES = join(import.meta.dirname, '..', '..', 'fixtures');
const SAMPLE_PROJECT = join(FIXTURES, 'sample-project');

describe('get_context tool', () => {
  it('should have correct tool definition', () => {
    expect(GET_CONTEXT_TOOL.name).toBe('get_context');
    expect(GET_CONTEXT_TOOL.inputSchema.required).toContain('workspace_path');
    expect(GET_CONTEXT_TOOL.description.length).toBeGreaterThan(0);
  });

  describe('handleGetContext', () => {
    const indexer = new WorkspaceIndexer();

    it('should return valid context JSON for sample project', async () => {
      const result = await handleGetContext(
        { workspace_path: SAMPLE_PROJECT },
        indexer,
      );

      const parsed = JSON.parse(result);

      // Stack detection
      expect(parsed.stack).toBeDefined();
      expect(parsed.stack.language).toBe('typescript');
      expect(parsed.stack.framework).toBe('nextjs');
      expect(parsed.stack.uiLibrary).toBe('react');
      expect(parsed.stack.testRunner).toBe('vitest');
      expect(parsed.stack.styling).toBe('tailwind');

      // Hot files
      expect(Array.isArray(parsed.hotFiles)).toBe(true);

      // Key folders
      expect(Array.isArray(parsed.keyFolders)).toBe(true);
      expect(parsed.keyFolders).toContain('src');

      // File count
      expect(parsed.fileCount).toBeGreaterThan(0);

      // AI instructions summary
      expect(typeof parsed.aiInstructionsSummary).toBe('string');

      // Last indexed
      expect(parsed.lastIndexed).toBeDefined();
    });

    it('should detect Prisma ORM in sample project', async () => {
      const result = await handleGetContext(
        { workspace_path: SAMPLE_PROJECT },
        indexer,
      );

      const parsed = JSON.parse(result);
      expect(parsed.stack.orm).toBe('prisma');
    });

    it('should return empty context for nonexistent workspace path (graceful degradation)', async () => {
      const result = await handleGetContext(
        { workspace_path: '/nonexistent/path/xyz' },
        indexer,
      );

      const parsed = JSON.parse(result);
      // Indexer returns a degraded fingerprint rather than throwing
      expect(parsed.stack.runtime).toBe('unknown');
      expect(parsed.fileCount).toBe(0);
      expect(parsed.hotFiles).toEqual([]);
    });
  });
});
