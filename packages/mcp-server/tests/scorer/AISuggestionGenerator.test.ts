import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AISuggestionGenerator } from '../../src/scorer/AISuggestionGenerator.js';
import type { ProjectFingerprint } from '../../src/indexer/types.js';
import type { HeuristicResult, ResolvedContext } from '../../src/scorer/types.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

const emptyContext: ResolvedContext = {
  relevantFiles: [],
  suggestedMentions: [],
  stackHints: [],
  conventionConflicts: [],
  missingConstraints: [],
  symbolReferences: [],
};

const baseFingerprint: ProjectFingerprint = {
  workspacePath: '/test',
  stack: { runtime: 'node', framework: null, uiLibrary: null, orm: null, testRunner: 'vitest', styling: null, language: 'typescript' },
  fileTree: [],
  hotFiles: [],
  aiInstructions: '',
  conventionHints: [],
  readmeSummary: '',
  keyFolders: ['src'],
  lastIndexed: new Date(),
  indexingErrors: [],
};

const sampleHeuristic: HeuristicResult = {
  dimensions: {
    specificity: { score: 8, max: 25, label: 'Specificity', penalties: ['Vague verbs'], bonuses: [] },
    context: { score: 10, max: 25, label: 'Context Completeness', penalties: [], bonuses: [] },
    clarity: { score: 7, max: 25, label: 'Task Clarity', penalties: ['No success criteria'], bonuses: [] },
    anchoring: { score: 5, max: 25, label: 'Anchoring', penalties: ['No file paths'], bonuses: [] },
  },
  firedRules: [
    { ruleId: 'vague_verb_unqualified', dimension: 'specificity', type: 'penalty', points: 3, detail: { count: '1' } },
    { ruleId: 'no_file_paths', dimension: 'anchoring', type: 'penalty', points: 8, detail: {} },
    { ruleId: 'no_success_criteria', dimension: 'clarity', type: 'penalty', points: 4, detail: {} },
  ],
  total: 30,
  grade: 'D',
};

describe('AISuggestionGenerator', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  describe('no API key fallback', () => {
    it('should use template-based suggestions when no API key', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const generator = new AISuggestionGenerator();
      const result = generator.buildTemplateFallback('fix the bug', sampleHeuristic);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
      expect(typeof result.enhancedPrompt).toBe('string');
      expect(result.enhancedPrompt).toContain('fix the bug');
    });

    it('should sort suggestions by priority', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const generator = new AISuggestionGenerator();
      const result = generator.buildTemplateFallback('fix it', sampleHeuristic);

      const priorities = result.suggestions.map((s) => s.priority);
      const order = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < priorities.length; i++) {
        expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
      }
    });
  });

  describe('template fallback content', () => {
    it('should generate suggestions from fired penalty rules', () => {
      const generator = new AISuggestionGenerator();
      const result = generator.buildTemplateFallback('fix the bug', sampleHeuristic);

      // Should have suggestions for vague_verb, no_file_paths, no_success_criteria
      const ruleIds = sampleHeuristic.firedRules
        .filter((r) => r.type === 'penalty')
        .map((r) => r.ruleId);

      expect(result.suggestions.length).toBe(ruleIds.length);
    });

    it('should produce enhanced prompt with additional context for high-priority items', () => {
      const generator = new AISuggestionGenerator();
      const result = generator.buildTemplateFallback('fix the bug', sampleHeuristic);

      // Enhanced prompt should contain original + contextual additions
      expect(result.enhancedPrompt).toContain('fix the bug');
      // Should have more content than just the original prompt
      if (result.suggestions.length > 0) {
        expect(result.enhancedPrompt.length).toBeGreaterThan('fix the bug'.length);
      }
    });

    it('should return original prompt when no penalties fired', () => {
      const noPenalties: HeuristicResult = {
        ...sampleHeuristic,
        firedRules: [
          { ruleId: 'output_format_stated', dimension: 'specificity', type: 'bonus', points: 3, detail: {} },
        ],
      };
      const generator = new AISuggestionGenerator();
      const result = generator.buildTemplateFallback('a great prompt', noPenalties);

      expect(result.suggestions).toHaveLength(0);
      expect(result.enhancedPrompt).toBe('a great prompt');
    });
  });

  describe('suggestion quality', () => {
    it('should assign valid priority, dimension, and text', () => {
      const generator = new AISuggestionGenerator();
      const result = generator.buildTemplateFallback('fix it', sampleHeuristic);

      for (const s of result.suggestions) {
        expect(['high', 'medium', 'low']).toContain(s.priority);
        expect(['specificity', 'context', 'clarity', 'anchoring']).toContain(s.dimension);
        expect(s.text.length).toBeGreaterThan(0);
      }
    });
  });
});
