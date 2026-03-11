import { describe, it, expect } from 'vitest';
import { HeuristicScorer } from '../../src/scorer/HeuristicScorer.js';
import type { ProjectFingerprint } from '../../src/indexer/types.js';
import type { ResolvedContext } from '../../src/scorer/types.js';
import type { SessionContext } from '../../src/session/types.js';

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
  fileTree: [
    { name: 'src', path: 'src', type: 'directory', children: [
      { name: 'auth.ts', path: 'src/auth.ts', type: 'file' },
      { name: 'server.ts', path: 'src/server.ts', type: 'file' },
    ] },
  ],
  hotFiles: ['src/auth.ts'],
  aiInstructions: '',
  conventionHints: [],
  readmeSummary: '',
  keyFolders: ['src'],
  lastIndexed: new Date(),
  indexingErrors: [],
};

describe('HeuristicScorer', () => {
  const scorer = new HeuristicScorer();

  describe('score()', () => {
    it('should return all four dimensions clamped to [0, 25]', () => {
      const result = scorer.score('fix the bug', baseFingerprint, emptyContext);
      for (const dim of Object.values(result.dimensions)) {
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.score).toBeLessThanOrEqual(25);
        expect(dim.max).toBe(25);
      }
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
    });

    it('should assign a valid grade', () => {
      const result = scorer.score('fix it', baseFingerprint, emptyContext);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    });

    it('should collect fired rules', () => {
      const result = scorer.score('fix the bug', baseFingerprint, emptyContext);
      expect(result.firedRules.length).toBeGreaterThan(0);
      for (const rule of result.firedRules) {
        expect(rule.ruleId).toBeTruthy();
        expect(['penalty', 'bonus']).toContain(rule.type);
        expect(['specificity', 'context', 'clarity', 'anchoring']).toContain(rule.dimension);
      }
    });
  });

  describe('Specificity dimension', () => {
    it('should fire vague_verb_unqualified penalty for vague verbs without context', () => {
      const result = scorer.score('fix the bug and help me improve it', baseFingerprint, emptyContext);
      const rule = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('penalty');
      expect(rule!.points).toBe(result.firedRules
        .filter((r) => r.ruleId === 'vague_verb_unqualified')
        .reduce((sum, r) => sum + r.points, 0));
    });

    it('should fire vague_verb_qualified (1pt) when vague verb has @file context', () => {
      const result = scorer.score('fix @src/auth.ts', baseFingerprint, emptyContext);
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(qualified).toBeDefined();
      expect(qualified!.points).toBe(1);
      expect(unqualified).toBeUndefined();
    });

    it('should fire vague_verb_qualified (1pt) when vague verb has PascalCase context', () => {
      const result = scorer.score('fix the UserService', baseFingerprint, emptyContext);
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      expect(qualified).toBeDefined();
      expect(qualified!.points).toBe(1);
    });

    it('should fire vague_verb_unqualified (3pts) for "fix it" with no context', () => {
      const result = scorer.score('fix it', baseFingerprint, emptyContext);
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(unqualified).toBeDefined();
      expect(unqualified!.points).toBe(3);
    });

    it('should fire short_prompt penalty for short prompts', () => {
      const result = scorer.score('fix auth', baseFingerprint, emptyContext);
      const rule = result.firedRules.find((r) => r.ruleId === 'short_prompt');
      expect(rule).toBeDefined();
      expect(rule!.points).toBe(6);
    });

    it('should fire output_format_stated bonus when format is specified', () => {
      const result = scorer.score(
        'Create a TypeScript function that validates email addresses and returns a boolean',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'output_format_stated');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });

    it('should fire structured_format bonus for bulleted prompts', () => {
      const result = scorer.score(
        'Refactor the auth module:\n- Extract token validation\n- Add refresh token support\n- Write tests',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'structured_format');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });

    it('should fire quantitative_constraint bonus when numbers present', () => {
      const result = scorer.score(
        'Add pagination to the list endpoint with 20 items per page',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'quantitative_constraint');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });
  });

  describe('Context Completeness dimension', () => {
    it('should fire fix_without_current_behavior for "fix" without expected/actual', () => {
      const result = scorer.score('fix the login', baseFingerprint, emptyContext);
      const rule = result.firedRules.find((r) => r.ruleId === 'fix_without_current_behavior');
      expect(rule).toBeDefined();
    });

    it('should NOT fire fix_without_current_behavior when expected/actual provided', () => {
      const result = scorer.score(
        'fix the login — should redirect to /dashboard but instead stays on /login',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'fix_without_current_behavior');
      expect(rule).toBeUndefined();
    });

    it('should fire expected_vs_actual bonus', () => {
      const result = scorer.score(
        'The validateToken function should return false for expired tokens but currently returns true',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'expected_vs_actual');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });

    it('should fire has_error_message bonus for quoted error text', () => {
      const result = scorer.score(
        'I get error "Cannot read property token of undefined" when calling the auth endpoint',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'has_error_message');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });

    it('should fire unmentioned_relevant_files when context has suggestions', () => {
      const contextWithSuggestions: ResolvedContext = {
        ...emptyContext,
        suggestedMentions: ['src/auth.ts', 'src/server.ts'],
      };
      const result = scorer.score('fix the auth', baseFingerprint, contextWithSuggestions);
      const rule = result.firedRules.find((r) => r.ruleId === 'unmentioned_relevant_files');
      expect(rule).toBeDefined();
      expect(rule!.points).toBe(8); // 2 files × 4pts
    });
  });

  describe('Task Clarity dimension', () => {
    it('should fire multiple_tasks penalty', () => {
      const result = scorer.score(
        'Fix the auth and also add rate limiting and then update the docs',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'multiple_tasks');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('penalty');
    });

    it('should fire no_success_criteria penalty', () => {
      const result = scorer.score('refactor the auth module', baseFingerprint, emptyContext);
      const rule = result.firedRules.find((r) => r.ruleId === 'no_success_criteria');
      expect(rule).toBeDefined();
    });

    it('should fire ambiguous_pronouns penalty', () => {
      const result = scorer.score('fix it and update that', baseFingerprint, emptyContext);
      const rule = result.firedRules.find((r) => r.ruleId === 'ambiguous_pronouns');
      expect(rule).toBeDefined();
    });

    it('should fire explicit_acceptance bonus for "it should"', () => {
      const result = scorer.score(
        'The validateToken function in @src/auth.ts should return false for expired tokens',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'explicit_acceptance');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });

    it('should fire references_ai_instructions bonus', () => {
      const result = scorer.score(
        'Update the auth flow following the patterns in CLAUDE.md',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'references_ai_instructions');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });

    it('should fire named_subject bonus for PascalCase names', () => {
      const result = scorer.score(
        'Refactor the ScoringEngine to separate heuristic and AI scoring',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'named_subject');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });
  });

  describe('Anchoring dimension', () => {
    it('should fire no_file_paths penalty when no paths present', () => {
      const result = scorer.score('fix the auth', baseFingerprint, emptyContext);
      const rule = result.firedRules.find((r) => r.ruleId === 'no_file_paths');
      expect(rule).toBeDefined();
      expect(rule!.points).toBe(5);
    });

    it('should fire accurate_file_ref bonus for valid @mentions', () => {
      const result = scorer.score(
        'Fix the JWT validation in @src/auth.ts — it should reject expired tokens',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'accurate_file_ref');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
    });

    it('should fire nonexistent_file_ref penalty for invalid paths', () => {
      const result = scorer.score(
        'Fix the bug in @src/nonexistent.ts',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'nonexistent_file_ref');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('penalty');
    });
  });

  describe('Symbol-aware scoring (Tier 2D)', () => {
    it('should fire verified_symbol_ref bonus for verified symbols', () => {
      const contextWithSymbols: ResolvedContext = {
        ...emptyContext,
        symbolReferences: [
          { name: 'UserService', filePath: 'src/services/UserService.ts', verified: true },
          { name: 'validateToken', filePath: 'src/auth.ts', verified: true },
        ],
      };
      const result = scorer.score(
        'Refactor the UserService to use validateToken for all endpoints',
        baseFingerprint,
        contextWithSymbols,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'verified_symbol_ref');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('bonus');
      expect(rule!.points).toBe(6); // 2 symbols × 3pts
    });

    it('should cap verified_symbol_ref bonus at 9pts', () => {
      const contextWithSymbols: ResolvedContext = {
        ...emptyContext,
        symbolReferences: [
          { name: 'A', filePath: 'a.ts', verified: true },
          { name: 'B', filePath: 'b.ts', verified: true },
          { name: 'C', filePath: 'c.ts', verified: true },
          { name: 'D', filePath: 'd.ts', verified: true },
        ],
      };
      const result = scorer.score(
        'Refactor A B C D across the codebase',
        baseFingerprint,
        contextWithSymbols,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'verified_symbol_ref');
      expect(rule).toBeDefined();
      expect(rule!.points).toBe(9); // capped
    });

    it('should fire nonexistent_symbol_ref penalty for unverified symbols', () => {
      const contextWithSymbols: ResolvedContext = {
        ...emptyContext,
        symbolReferences: [
          { name: 'NonExistentService', filePath: null, verified: false },
        ],
      };
      const result = scorer.score(
        'Update the NonExistentService to handle errors',
        baseFingerprint,
        contextWithSymbols,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'nonexistent_symbol_ref');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('penalty');
      expect(rule!.points).toBe(2);
    });

    it('should fire symbol_file_mismatch when symbol is in different file than @mentioned', () => {
      const contextWithSymbols: ResolvedContext = {
        ...emptyContext,
        symbolReferences: [
          { name: 'validateToken', filePath: 'src/auth.ts', verified: true },
        ],
      };
      const result = scorer.score(
        'Fix validateToken in @src/server.ts',
        baseFingerprint,
        contextWithSymbols,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'symbol_file_mismatch');
      expect(rule).toBeDefined();
      expect(rule!.type).toBe('penalty');
      expect(rule!.points).toBe(3);
    });
  });

  describe('EC6: skip vague verbs inside quoted/example text', () => {
    it('should NOT count vague verbs inside backtick spans', () => {
      const result = scorer.score(
        'The function description says `fix and update and improve` but the real issue is the return type is wrong',
        baseFingerprint,
        emptyContext,
      );
      // "fix", "update", "improve" are inside backticks — should not be counted
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      // The only vague verb outside quotes should be none (no bare vague verbs outside backticks)
      expect(unqualified).toBeUndefined();
    });

    it('should NOT count vague verbs inside double-quoted strings', () => {
      const result = scorer.score(
        'The error message is "fix update improve handle" and we need to change the return type',
        baseFingerprint,
        emptyContext,
      );
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(unqualified).toBeUndefined();
    });

    it('should NOT count vague verbs inside fenced code blocks', () => {
      const result = scorer.score(
        'Here is the code:\n```\nfix update improve\n```\nThe return type should be boolean',
        baseFingerprint,
        emptyContext,
      );
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(unqualified).toBeUndefined();
    });

    it('should still count vague verbs OUTSIDE quoted content', () => {
      const result = scorer.score(
        'fix the bug, the error says `some error message`',
        baseFingerprint,
        emptyContext,
      );
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(unqualified).toBeDefined();
      expect(unqualified!.points).toBe(3); // 1 unqualified × 3pts
    });
  });

  describe('EC9: bidirectional qualifier window', () => {
    it('should treat @ref BEFORE the vague verb as qualified', () => {
      const result = scorer.score(
        'In @src/auth.ts, fix the validation logic for expired tokens',
        baseFingerprint,
        emptyContext,
      );
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(qualified).toBeDefined();
      expect(unqualified).toBeUndefined();
    });

    it('should treat PascalCase identifier BEFORE the vague verb as qualified', () => {
      const result = scorer.score(
        'The UserService needs to fix the token refresh flow',
        baseFingerprint,
        emptyContext,
      );
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(qualified).toBeDefined();
      expect(unqualified).toBeUndefined();
    });

    it('should still qualify forward references (regression guard)', () => {
      const result = scorer.score('fix @src/auth.ts', baseFingerprint, emptyContext);
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(qualified).toBeDefined();
      expect(qualified!.points).toBe(1);
      expect(unqualified).toBeUndefined();
    });
  });

  describe('EC8: PascalCase tech name blocklist', () => {
    it('should NOT count TypeScript as a named_subject', () => {
      const result = scorer.score(
        'Create a TypeScript function that validates email addresses and returns a boolean',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'named_subject');
      expect(rule).toBeUndefined();
    });

    it('should NOT count JavaScript/NodeJs as named_subjects', () => {
      const result = scorer.score(
        'How do I handle async errors in JavaScript with NodeJs and return a proper result',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'named_subject');
      expect(rule).toBeUndefined();
    });

    it('should still count real project identifiers as named_subjects', () => {
      const result = scorer.score(
        'Refactor the UserService to separate heuristic and AI scoring',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'named_subject');
      expect(rule).toBeDefined();
      expect(rule!.detail.names).toContain('UserService');
    });

    it('should filter blocklisted names but keep real identifiers in named_subjects', () => {
      const result = scorer.score(
        'Add TypeScript types to the UserService and AuthController',
        baseFingerprint,
        emptyContext,
      );
      const rule = result.firedRules.find((r) => r.ruleId === 'named_subject');
      expect(rule).toBeDefined();
      expect(rule!.detail.names).toContain('UserService');
      expect(rule!.detail.names).toContain('AuthController');
      expect(rule!.detail.names).not.toContain('TypeScript');
    });

    it('should NOT qualify vague verb with blocklisted PascalCase name', () => {
      const result = scorer.score(
        'fix the TypeScript configuration',
        baseFingerprint,
        emptyContext,
      );
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      const unqualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_unqualified');
      expect(qualified).toBeUndefined();
      expect(unqualified).toBeDefined();
    });

    it('should still qualify vague verb with real PascalCase identifier', () => {
      const result = scorer.score(
        'fix the UserService',
        baseFingerprint,
        emptyContext,
      );
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      expect(qualified).toBeDefined();
    });

    it('should qualify vague verb when both blocklisted AND real PascalCase are nearby', () => {
      const result = scorer.score(
        'fix the TypeScript UserService module',
        baseFingerprint,
        emptyContext,
      );
      const qualified = result.firedRules.find((r) => r.ruleId === 'vague_verb_qualified');
      expect(qualified).toBeDefined();
    });
  });

  describe('Session context scoring adjustments', () => {
    const sessionWithSubjects: SessionContext = {
      recentMessages: [
        {
          type: 'user',
          content: 'Fix the UserService in @src/auth.ts',
          timestamp: new Date(),
          filesReferenced: ['src/auth.ts'],
          symbolsReferenced: ['UserService'],
        },
      ],
      recentFiles: ['src/auth.ts'],
      recentSubjects: ['UserService'],
      messageCount: 1,
      sessionId: 'test-session',
    };

    const sessionWithBugDescription: SessionContext = {
      recentMessages: [
        {
          type: 'user',
          content: 'The login endpoint is broken and returns a 500 error',
          timestamp: new Date(),
          filesReferenced: [],
          symbolsReferenced: [],
        },
      ],
      recentFiles: [],
      recentSubjects: [],
      messageCount: 1,
      sessionId: 'test-session',
    };

    it('should reduce ambiguous_pronouns penalty with session subjects', () => {
      const withoutSession = scorer.score('fix it', baseFingerprint, emptyContext);
      const withSession = scorer.score('fix it', baseFingerprint, emptyContext, sessionWithSubjects);

      const ruleWithout = withoutSession.firedRules.find((r) => r.ruleId === 'ambiguous_pronouns');
      const ruleWith = withSession.firedRules.find((r) => r.ruleId === 'ambiguous_pronouns_session');

      expect(ruleWithout).toBeDefined();
      expect(ruleWithout!.points).toBe(3);
      expect(ruleWith).toBeDefined();
      expect(ruleWith!.points).toBe(1);
    });

    it('should suppress no_file_paths penalty with session files', () => {
      const withoutSession = scorer.score('fix the auth', baseFingerprint, emptyContext);
      const withSession = scorer.score('fix the auth', baseFingerprint, emptyContext, sessionWithSubjects);

      const penaltyWithout = withoutSession.firedRules.find((r) => r.ruleId === 'no_file_paths');
      const sessionRule = withSession.firedRules.find((r) => r.ruleId === 'no_file_paths_session');

      expect(penaltyWithout).toBeDefined();
      expect(penaltyWithout!.points).toBe(5);
      expect(sessionRule).toBeDefined();
      expect(sessionRule!.points).toBe(0);
    });

    it('should reduce fix_without_current_behavior penalty when session describes bug', () => {
      const withoutSession = scorer.score('fix the login', baseFingerprint, emptyContext);
      const withSession = scorer.score('fix the login', baseFingerprint, emptyContext, sessionWithBugDescription);

      const ruleWithout = withoutSession.firedRules.find((r) => r.ruleId === 'fix_without_current_behavior');
      const ruleWith = withSession.firedRules.find((r) => r.ruleId === 'fix_without_current_behavior_session');

      expect(ruleWithout).toBeDefined();
      expect(ruleWithout!.points).toBe(5);
      expect(ruleWith).toBeDefined();
      expect(ruleWith!.points).toBe(2);
    });

    it('should not affect scoring when no session context provided', () => {
      const result = scorer.score('fix it', baseFingerprint, emptyContext);
      const sessionRule = result.firedRules.find(
        (r) => r.ruleId.includes('_session'),
      );
      expect(sessionRule).toBeUndefined();
    });

    it('should not fire entity_not_pathed for session-injected files', () => {
      const contextWithSessionFiles: ResolvedContext = {
        ...emptyContext,
        relevantFiles: [
          { path: 'src/auth.ts', reason: 'Referenced in prior session messages', weight: 0.6 },
        ],
      };
      const result = scorer.score('fix that', baseFingerprint, contextWithSessionFiles, sessionWithSubjects);
      const rule = result.firedRules.find((r) => r.ruleId === 'entity_not_pathed');
      expect(rule).toBeUndefined();
    });

    it('should score multi-turn prompt significantly higher with session', () => {
      // "now fix that" — terrible without context, reasonable with it
      const without = scorer.score('now fix that', baseFingerprint, emptyContext);
      const withSess = scorer.score('now fix that', baseFingerprint, emptyContext, sessionWithSubjects);
      expect(withSess.total).toBeGreaterThan(without.total);
      expect(withSess.total - without.total).toBeGreaterThanOrEqual(5);
    });
  });

  describe('end-to-end scoring', () => {
    it('should score a vague prompt below 50', () => {
      const result = scorer.score('fix the bug', baseFingerprint, emptyContext);
      expect(result.total).toBeLessThan(50);
    });

    it('should score a well-crafted prompt above 50', () => {
      const good = scorer.score(
        'In @src/auth.ts, the validateToken function should return false for expired JWT tokens but currently returns true. The error is `jwt expired` from jsonwebtoken. It should check the exp claim before returning.',
        baseFingerprint,
        emptyContext,
      );
      expect(good.total).toBeGreaterThanOrEqual(50);
    });
  });
});
