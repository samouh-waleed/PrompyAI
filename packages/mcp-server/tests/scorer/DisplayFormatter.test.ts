import { describe, it, expect } from 'vitest';
import { formatDisplay } from '../../src/scorer/DisplayFormatter.js';
import type { ScoreResult, Suggestion } from '../../src/scorer/types.js';

function makeResult(overrides: Partial<Omit<ScoreResult, 'display'>> = {}): Omit<ScoreResult, 'display'> {
  return {
    total: 28,
    grade: 'F',
    dimensions: {
      specificity: { score: 6, max: 25, label: 'Specificity', penalties: ['Vague verbs'], bonuses: [] },
      context: { score: 5, max: 25, label: 'Context Completeness', penalties: [], bonuses: [] },
      clarity: { score: 10, max: 25, label: 'Task Clarity', penalties: [], bonuses: [] },
      anchoring: { score: 7, max: 25, label: 'File & Folder Anchoring', penalties: [], bonuses: [] },
    },
    suggestions: [
      { priority: 'high', dimension: 'specificity', text: 'Replace "fix" with what\'s actually broken', example: '"debug the JWT validation error in @src/auth.ts"' },
      { priority: 'high', dimension: 'anchoring', text: 'Add file paths using @mentions', example: '@src/middleware/auth.ts' },
      { priority: 'medium', dimension: 'context', text: 'Describe expected vs actual behavior' },
    ],
    enhancedPrompt: 'In @src/auth.ts, fix the JWT validation so it returns 200 for valid tokens.',
    scoredAt: new Date(),
    ...overrides,
  };
}

describe('DisplayFormatter', () => {
  describe('score line', () => {
    it('should include score and grade on first line', () => {
      const output = formatDisplay(makeResult(), 'fix the auth');
      expect(output.split('\n')[0]).toBe('Prompt Score: 28/100 [F]');
    });

    it('should show correct score and grade for different values', () => {
      const output = formatDisplay(makeResult({ total: 82, grade: 'B' }), 'test');
      expect(output.split('\n')[0]).toBe('Prompt Score: 82/100 [B]');
    });
  });

  describe('dimension bars', () => {
    it('should show all four dimension labels', () => {
      const output = formatDisplay(makeResult(), 'fix the auth');
      expect(output).toContain('Specificity');
      expect(output).toContain('Context Completeness');
      expect(output).toContain('Task Clarity');
      expect(output).toContain('File & Folder Anchoring');
    });

    it('should render full bar for 25/25', () => {
      const result = makeResult({
        dimensions: {
          specificity: { score: 25, max: 25, label: 'Specificity', penalties: [], bonuses: [] },
          context: { score: 0, max: 25, label: 'Context', penalties: [], bonuses: [] },
          clarity: { score: 12, max: 25, label: 'Clarity', penalties: [], bonuses: [] },
          anchoring: { score: 0, max: 25, label: 'Anchoring', penalties: [], bonuses: [] },
        },
      });
      const output = formatDisplay(result, 'test');
      // 25/25 → all = (14 chars)
      expect(output).toContain('==============');
      // 0/25 → all . (14 chars)
      expect(output).toContain('..............');
    });

    it('should render proportional bars', () => {
      const result = makeResult({
        dimensions: {
          specificity: { score: 13, max: 25, label: 'Specificity', penalties: [], bonuses: [] },
          context: { score: 13, max: 25, label: 'Context', penalties: [], bonuses: [] },
          clarity: { score: 13, max: 25, label: 'Clarity', penalties: [], bonuses: [] },
          anchoring: { score: 13, max: 25, label: 'Anchoring', penalties: [], bonuses: [] },
        },
      });
      const output = formatDisplay(result, 'test');
      // 13/25 → ~7 filled, ~7 empty
      const specLine = output.split('\n').find((l) => l.includes('Specificity'))!;
      expect(specLine).toContain('13/25');
      const barMatch = specLine.match(/([=.]+)$/);
      expect(barMatch).toBeTruthy();
      expect(barMatch![1].length).toBe(14);
    });
  });

  describe('tone adaptation', () => {
    it('should use celebratory tone for A grade', () => {
      const result = makeResult({
        total: 92, grade: 'A',
        suggestions: [{ priority: 'low', dimension: 'specificity', text: 'Minor tweak' }],
      });
      const output = formatDisplay(result, 'test');
      expect(output).toContain('Nearly perfect');
    });

    it('should use encouraging tone for B grade', () => {
      const result = makeResult({ total: 75, grade: 'B' });
      const output = formatDisplay(result, 'test');
      expect(output).toContain('Looking good');
    });

    it('should use neutral tone for C grade', () => {
      const result = makeResult({ total: 55, grade: 'C' });
      const output = formatDisplay(result, 'test');
      expect(output).toContain('Suggestions to strengthen');
    });

    it('should use urgent tone for D grade', () => {
      const result = makeResult({ total: 35, grade: 'D' });
      const output = formatDisplay(result, 'test');
      expect(output).toContain('needs work');
    });

    it('should use critical tone for F grade', () => {
      const output = formatDisplay(makeResult(), 'fix the auth');
      expect(output).toContain('too vague');
    });

    it('should say "Perfect score. Ship it." for 100/100', () => {
      const result = makeResult({
        total: 100, grade: 'A',
        suggestions: [],
        enhancedPrompt: 'same prompt',
      });
      const output = formatDisplay(result, 'same prompt');
      expect(output).toContain('Perfect score. Ship it.');
    });

    it('should say "Great prompt" for A grade with no suggestions', () => {
      const result = makeResult({
        total: 92, grade: 'A',
        suggestions: [],
        enhancedPrompt: 'same',
      });
      const output = formatDisplay(result, 'same');
      expect(output).toContain('Great prompt. No suggestions needed.');
    });
  });

  describe('suggestions', () => {
    it('should format numbered suggestions', () => {
      const output = formatDisplay(makeResult(), 'fix the auth');
      expect(output).toMatch(/\s+1\.\s/);
      expect(output).toMatch(/\s+2\.\s/);
      expect(output).toMatch(/\s+3\.\s/);
    });

    it('should show examples with > prefix', () => {
      const output = formatDisplay(makeResult(), 'fix the auth');
      expect(output).toContain('> "debug the JWT');
      expect(output).toContain('> @src/middleware/auth.ts');
    });

    it('should skip suggestions section when array is empty and not A grade', () => {
      const result = makeResult({ total: 55, grade: 'C', suggestions: [] });
      const output = formatDisplay(result, 'test');
      expect(output).not.toContain('Suggestions');
      expect(output).not.toContain('1.');
    });

    it('should limit to 5 suggestions', () => {
      const manySuggestions: Suggestion[] = Array.from({ length: 7 }, (_, i) => ({
        priority: 'medium' as const,
        dimension: 'specificity' as const,
        text: `Suggestion ${i + 1}`,
      }));
      const result = makeResult({ suggestions: manySuggestions });
      const output = formatDisplay(result, 'test');
      expect(output).toContain('5.');
      expect(output).not.toContain('6.');
    });

    it('should use singular "suggestion" for count of 1', () => {
      const result = makeResult({
        total: 75, grade: 'B',
        suggestions: [{ priority: 'medium', dimension: 'specificity', text: 'One thing' }],
      });
      const output = formatDisplay(result, 'test');
      expect(output).toContain('One suggestion:');
    });
  });

  describe('enhanced prompt', () => {
    it('should show enhanced prompt in code block when different from original', () => {
      const output = formatDisplay(makeResult(), 'fix the auth');
      expect(output).toContain('Enhanced prompt:');
      expect(output).toContain('```');
      expect(output).toContain('In @src/auth.ts');
    });

    it('should skip enhanced prompt when identical to original', () => {
      const result = makeResult({ enhancedPrompt: 'fix the auth' });
      const output = formatDisplay(result, 'fix the auth');
      expect(output).not.toContain('Enhanced prompt:');
      expect(output).not.toContain('```');
    });

    it('should skip enhanced prompt when identical after trimming', () => {
      const result = makeResult({ enhancedPrompt: '  fix the auth  ' });
      const output = formatDisplay(result, 'fix the auth');
      expect(output).not.toContain('Enhanced prompt:');
    });
  });

  describe('edge cases', () => {
    it('should handle zero score gracefully', () => {
      const result = makeResult({
        total: 0, grade: 'F',
        dimensions: {
          specificity: { score: 0, max: 25, label: 'Specificity', penalties: [], bonuses: [] },
          context: { score: 0, max: 25, label: 'Context', penalties: [], bonuses: [] },
          clarity: { score: 0, max: 25, label: 'Clarity', penalties: [], bonuses: [] },
          anchoring: { score: 0, max: 25, label: 'Anchoring', penalties: [], bonuses: [] },
        },
      });
      const output = formatDisplay(result, 'x');
      expect(output).toContain('Prompt Score: 0/100 [F]');
      expect(output).toContain('..............');
    });

    it('should stay under 35 lines for a full bad-prompt result', () => {
      const output = formatDisplay(makeResult(), 'fix the auth');
      const lineCount = output.split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(35);
    });
  });
});
