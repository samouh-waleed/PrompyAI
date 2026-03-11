import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EVALUATE_PROMPT_TOOL, handleEvaluatePrompt } from '../../../src/mcp/tools/evaluate.js';
import { WorkspaceIndexer } from '../../../src/indexer/WorkspaceIndexer.js';
import { ScoringEngine } from '../../../src/scorer/ScoringEngine.js';

// Mock the Anthropic SDK to avoid real API calls
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

const FIXTURES = join(import.meta.dirname, '..', '..', 'fixtures');
const SAMPLE_PROJECT = join(FIXTURES, 'sample-project');

function readPrompt(name: string): string {
  return readFileSync(join(FIXTURES, 'prompts', name), 'utf-8').trim();
}

describe('evaluate_prompt tool', () => {
  it('should have correct tool definition', () => {
    expect(EVALUATE_PROMPT_TOOL.name).toBe('evaluate_prompt');
    expect(EVALUATE_PROMPT_TOOL.inputSchema.required).toContain('prompt');
    expect(EVALUATE_PROMPT_TOOL.inputSchema.required).toContain('workspace_path');
    expect(EVALUATE_PROMPT_TOOL.description.length).toBeGreaterThan(0);
  });

  describe('handleEvaluatePrompt', () => {
    const indexer = new WorkspaceIndexer();
    const scorer = new ScoringEngine();

    it('should return valid ScoreResult JSON for vague prompt', async () => {
      const result = await handleEvaluatePrompt(
        { prompt: 'fix the auth', workspace_path: SAMPLE_PROJECT },
        indexer,
        scorer,
      );

      const parsed = JSON.parse(result);
      expect(parsed.total).toBeGreaterThanOrEqual(0);
      expect(parsed.total).toBeLessThanOrEqual(100);
      expect(parsed.total).toBeLessThan(50);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(parsed.grade);
      expect(parsed.dimensions.specificity).toBeDefined();
      expect(parsed.dimensions.context).toBeDefined();
      expect(parsed.dimensions.clarity).toBeDefined();
      expect(parsed.dimensions.anchoring).toBeDefined();
      expect(parsed.dimensions.specificity.max).toBe(25);
      expect(Array.isArray(parsed.suggestions)).toBe(true);
      expect(parsed.suggestions.length).toBeGreaterThan(0);
      expect(typeof parsed.enhancedPrompt).toBe('string');
      expect(parsed.scoredAt).toBeDefined();
      // Display field
      expect(typeof parsed.display).toBe('string');
      expect(parsed.display).toContain('Prompt Score:');
      expect(parsed.display).toContain('Specificity');
    });

    it('should return higher score for well-crafted prompt', async () => {
      const goodPrompt = readPrompt('good.txt');
      const result = await handleEvaluatePrompt(
        { prompt: goodPrompt, workspace_path: SAMPLE_PROJECT },
        indexer,
        scorer,
      );

      const parsed = JSON.parse(result);
      expect(parsed.total).toBeGreaterThanOrEqual(50);
      expect(['A', 'B', 'C']).toContain(parsed.grade);
    });

    it('should score vague prompt lower than detailed prompt', async () => {
      const vagueResult = await handleEvaluatePrompt(
        { prompt: 'fix the auth', workspace_path: SAMPLE_PROJECT },
        indexer,
        scorer,
      );
      const goodResult = await handleEvaluatePrompt(
        { prompt: readPrompt('good.txt'), workspace_path: SAMPLE_PROJECT },
        indexer,
        scorer,
      );

      expect(JSON.parse(vagueResult).total).toBeLessThan(JSON.parse(goodResult).total);
    });

    it('should return a low score for nonexistent workspace path (graceful degradation)', async () => {
      const result = await handleEvaluatePrompt(
        { prompt: 'test', workspace_path: '/nonexistent/path/xyz' },
        indexer,
        scorer,
      );

      const parsed = JSON.parse(result);
      // Should still return valid ScoreResult (indexer gracefully handles missing paths)
      expect(parsed.total).toBeGreaterThanOrEqual(0);
      expect(parsed.total).toBeLessThanOrEqual(100);
    });

    it('should accept optional active_file parameter', async () => {
      const result = await handleEvaluatePrompt(
        {
          prompt: 'fix the auth',
          workspace_path: SAMPLE_PROJECT,
          active_file: 'src/index.ts',
        },
        indexer,
        scorer,
      );

      const parsed = JSON.parse(result);
      expect(parsed.total).toBeGreaterThanOrEqual(0);
    });
  });
});
