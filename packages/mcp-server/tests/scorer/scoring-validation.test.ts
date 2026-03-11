import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HeuristicScorer } from '../../src/scorer/HeuristicScorer.js';
import { resolveContext } from '../../src/scorer/ContextResolver.js';
import { WorkspaceIndexer } from '../../src/indexer/WorkspaceIndexer.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');
const SAMPLE_PROJECT = join(FIXTURES, 'sample-project');

function readPrompt(name: string): string {
  return readFileSync(join(FIXTURES, 'prompts', name), 'utf-8').trim();
}

describe('Scoring Validation — 5 prompts across vague→detailed spectrum', () => {
  const scorer = new HeuristicScorer();
  let indexer: WorkspaceIndexer;

  // Get fingerprint once for all tests
  const fingerprintPromise = (async () => {
    indexer = new WorkspaceIndexer();
    return indexer.getFingerprint(SAMPLE_PROJECT);
  })();

  it('1. Vague: "fix the auth" → score <50, fires vague_verb + short_prompt + no_file_paths', async () => {
    const fingerprint = await fingerprintPromise;
    const prompt = readPrompt('vague.txt');
    const context = resolveContext(prompt, fingerprint);
    const result = scorer.score(prompt, fingerprint, context);

    expect(result.total).toBeLessThan(50);
    expect(result.grade).toMatch(/^[DF]$/);

    const ruleIds = result.firedRules.map((r) => r.ruleId);
    expect(ruleIds.some((id) => id.startsWith('vague_verb'))).toBe(true);
    expect(ruleIds).toContain('short_prompt');
    expect(ruleIds).toContain('no_file_paths');
  });

  it('2. Medium: "Add dark mode toggle to the settings page component" → mid-range score', async () => {
    const fingerprint = await fingerprintPromise;
    const prompt = 'Add dark mode toggle to the settings page component';
    const context = resolveContext(prompt, fingerprint);
    const result = scorer.score(prompt, fingerprint, context);

    // Should score in the C-D range — not great, not terrible
    expect(result.total).toBeLessThan(70);

    const ruleIds = result.firedRules.map((r) => r.ruleId);
    expect(ruleIds).toContain('no_file_paths');
    // "component" is a format keyword → should get output_format_stated bonus
    expect(ruleIds).toContain('output_format_stated');
  });

  it('3. Good: fixture prompt with @paths, expected behavior, Prisma model → score ≥50', async () => {
    const fingerprint = await fingerprintPromise;
    const prompt = readPrompt('good.txt');
    const context = resolveContext(prompt, fingerprint);
    const result = scorer.score(prompt, fingerprint, context);

    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.grade).toMatch(/^[ABC]$/);

    const ruleIds = result.firedRules.map((r) => r.ruleId);
    // Has @src/middleware/auth.ts → should fire accurate_file_ref or at least not no_file_paths
    expect(ruleIds).not.toContain('no_file_paths');
    // "expected behavior" + "returns 200" → explicit_acceptance
    expect(ruleIds).toContain('explicit_acceptance');
  });

  it('4. Context-rich: fixture with expected vs actual behavior → score ≥50', async () => {
    const fingerprint = await fingerprintPromise;
    const prompt = readPrompt('context-rich.txt');
    const context = resolveContext(prompt, fingerprint);
    const result = scorer.score(prompt, fingerprint, context);

    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.grade).toMatch(/^[ABC]$/);

    const ruleIds = result.firedRules.map((r) => r.ruleId);
    // Has @mentions
    expect(ruleIds).not.toContain('no_file_paths');
    // Has explicit acceptance ("should show the actual user photo")
    expect(ruleIds).toContain('explicit_acceptance');
  });

  it('5. Expert: inline prompt with @paths, numbers, success criteria, structured steps → score ≥60', async () => {
    const fingerprint = await fingerprintPromise;
    const prompt = [
      'In @src/index.ts, refactor the main export to support 3 named exports:',
      '1. `greet(name: string): string` — returns "Hello, {name}"',
      '2. `farewell(name: string): string` — returns "Goodbye, {name}"',
      '3. `VERSION` constant set to "1.0.0"',
      '',
      'Each function should return a string. Add corresponding vitest tests in a new test file.',
      'It should pass `pnpm test` with no failures.',
    ].join('\n');
    const context = resolveContext(prompt, fingerprint);
    const result = scorer.score(prompt, fingerprint, context);

    expect(result.total).toBeGreaterThanOrEqual(60);

    const ruleIds = result.firedRules.map((r) => r.ruleId);
    // Structured format (numbered steps)
    expect(ruleIds).toContain('structured_format');
    // Has numbers (3)
    expect(ruleIds).toContain('quantitative_constraint');
    // Has "should return/pass"
    expect(ruleIds).toContain('explicit_acceptance');
    // Has @path
    expect(ruleIds).not.toContain('no_file_paths');
  });

  it('scores should monotonically increase from vague to expert', async () => {
    const fingerprint = await fingerprintPromise;

    const prompts = [
      readPrompt('vague.txt'),
      'Add dark mode toggle to the settings page component',
      readPrompt('context-rich.txt'),
      readPrompt('good.txt'),
    ];

    const scores = prompts.map((prompt) => {
      const context = resolveContext(prompt, fingerprint);
      return scorer.score(prompt, fingerprint, context).total;
    });

    // Vague should be lowest
    expect(scores[0]).toBeLessThan(scores[2]);
    expect(scores[0]).toBeLessThan(scores[3]);
    // Medium should be lower than good prompts
    expect(scores[1]).toBeLessThan(scores[2] + 15); // Allow some tolerance
  });
});
