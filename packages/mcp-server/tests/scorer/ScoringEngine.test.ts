import { describe, it, expect, vi } from 'vitest';
import { ScoringEngine } from '../../src/scorer/ScoringEngine.js';
import type { ProjectFingerprint } from '../../src/indexer/types.js';

// Mock the Anthropic SDK so no real API calls are made
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

const testFingerprint: ProjectFingerprint = {
  workspacePath: '/test-project',
  stack: {
    runtime: 'node',
    framework: 'express',
    uiLibrary: null,
    orm: null,
    testRunner: 'vitest',
    styling: null,
    language: 'typescript',
  },
  fileTree: [
    {
      name: 'src', path: 'src', type: 'directory', children: [
        { name: 'auth.ts', path: 'src/auth.ts', type: 'file' },
        { name: 'server.ts', path: 'src/server.ts', type: 'file' },
        { name: 'middleware', path: 'src/middleware', type: 'directory', children: [
          { name: 'rateLimiter.ts', path: 'src/middleware/rateLimiter.ts', type: 'file' },
        ] },
      ],
    },
  ],
  hotFiles: ['src/auth.ts'],
  aiInstructions: '',
  conventionHints: [],
  readmeSummary: 'Express REST API',
  keyFolders: ['src', 'src/middleware'],
  lastIndexed: new Date(),
  indexingErrors: [],
};

describe('ScoringEngine', () => {
  it('should return a complete ScoreResult with all dimensions', async () => {
    // Unset API key to force template fallback
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const engine = new ScoringEngine();
    const result = await engine.evaluate('fix the auth', testFingerprint);

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    expect(result.dimensions.specificity).toBeDefined();
    expect(result.dimensions.context).toBeDefined();
    expect(result.dimensions.clarity).toBeDefined();
    expect(result.dimensions.anchoring).toBeDefined();
    expect(result.dimensions.specificity.max).toBe(25);
    expect(result.scoredAt).toBeInstanceOf(Date);
    expect(typeof result.enhancedPrompt).toBe('string');
    expect(Array.isArray(result.suggestions)).toBe(true);

    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it('should score a vague prompt lower than a detailed prompt', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const engine = new ScoringEngine();
    const vague = await engine.evaluate('fix it', testFingerprint);
    const detailed = await engine.evaluate(
      'In @src/auth.ts, the validateToken function should return false for expired JWT tokens but currently returns true. The error message is `jwt expired`. Expected behavior: return 401 status.',
      testFingerprint,
    );

    expect(vague.total).toBeLessThan(detailed.total);

    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it('should generate suggestions for low-scoring prompts', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const engine = new ScoringEngine();
    const result = await engine.evaluate('fix the bug', testFingerprint);

    expect(result.suggestions.length).toBeGreaterThan(0);

    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it('should include penalties and bonuses in dimension scores', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const engine = new ScoringEngine();
    const result = await engine.evaluate('fix the bug', testFingerprint);

    // A vague prompt should have penalties
    const allPenalties = Object.values(result.dimensions).flatMap((d) => d.penalties);
    expect(allPenalties.length).toBeGreaterThan(0);

    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });
});
