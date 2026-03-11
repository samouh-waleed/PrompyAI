import { describe, it, expect } from 'vitest';
import { resolveContext } from '../../src/scorer/ContextResolver.js';
import type { ProjectFingerprint, FileNode } from '../../src/indexer/types.js';

// ── Rich test fixture ──────────────────────────────────────────────────

function makeFileTree(): FileNode[] {
  return [
    {
      name: 'src', path: 'src', type: 'directory', children: [
        {
          name: 'middleware', path: 'src/middleware', type: 'directory', children: [
            { name: 'auth.ts', path: 'src/middleware/auth.ts', type: 'file' },
          ],
        },
        {
          name: 'models', path: 'src/models', type: 'directory', children: [
            { name: 'User.ts', path: 'src/models/User.ts', type: 'file' },
            { name: 'Post.ts', path: 'src/models/Post.ts', type: 'file' },
          ],
        },
        {
          name: 'routes', path: 'src/routes', type: 'directory', children: [
            { name: 'api.ts', path: 'src/routes/api.ts', type: 'file' },
          ],
        },
        {
          name: 'components', path: 'src/components', type: 'directory', children: [
            { name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file' },
            { name: 'UserCard.tsx', path: 'src/components/UserCard.tsx', type: 'file' },
            {
              name: 'ui', path: 'src/components/ui', type: 'directory', children: [
                { name: 'Avatar.tsx', path: 'src/components/ui/Avatar.tsx', type: 'file' },
              ],
            },
          ],
        },
        {
          name: 'utils', path: 'src/utils', type: 'directory', children: [
            { name: 'logger.ts', path: 'src/utils/logger.ts', type: 'file' },
          ],
        },
      ],
    },
    {
      name: 'prisma', path: 'prisma', type: 'directory', children: [
        { name: 'schema.prisma', path: 'prisma/schema.prisma', type: 'file' },
      ],
    },
    {
      name: 'tests', path: 'tests', type: 'directory', children: [
        { name: 'auth.test.ts', path: 'tests/auth.test.ts', type: 'file' },
      ],
    },
  ];
}

function makeFingerprint(overrides?: Partial<ProjectFingerprint>): ProjectFingerprint {
  return {
    workspacePath: '/test/project',
    stack: {
      runtime: 'node',
      framework: 'nextjs',
      uiLibrary: 'react',
      orm: 'prisma',
      testRunner: 'vitest',
      styling: 'tailwind',
      language: 'typescript',
    },
    fileTree: makeFileTree(),
    hotFiles: ['src/middleware/auth.ts', 'src/models/User.ts'],
    aiInstructions: 'Always use named exports.\nUse vitest for testing.\nAvoid any usage.\nPrefer async/await over .then().',
    conventionHints: ['Framework: nextjs', 'ORM: prisma'],
    readmeSummary: 'A sample Next.js project',
    keyFolders: ['src', 'tests', 'prisma'],
    lastIndexed: new Date(),
    indexingErrors: [],
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('ContextResolver', () => {
  describe('basic behavior', () => {
    it('should return a valid ResolvedContext', () => {
      const ctx = resolveContext('add authentication', makeFingerprint());
      expect(ctx).toBeDefined();
      expect(Array.isArray(ctx.relevantFiles)).toBe(true);
      expect(Array.isArray(ctx.suggestedMentions)).toBe(true);
      expect(Array.isArray(ctx.stackHints)).toBe(true);
      expect(Array.isArray(ctx.conventionConflicts)).toBe(true);
      expect(Array.isArray(ctx.missingConstraints)).toBe(true);
    });

    it('should handle empty fingerprint without crashing', () => {
      const emptyFp = makeFingerprint({
        fileTree: [],
        hotFiles: [],
        aiInstructions: '',
        conventionHints: [],
      });
      const ctx = resolveContext('fix the auth', emptyFp);
      expect(ctx.relevantFiles).toEqual([]);
      expect(ctx.suggestedMentions).toEqual([]);
    });
  });

  describe('file relevance', () => {
    it('should find relevant files for "auth" keyword', () => {
      const ctx = resolveContext('fix the auth middleware', makeFingerprint());
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/middleware/auth.ts');
      expect(paths).toContain('tests/auth.test.ts');
    });

    it('should give recency boost to hot files', () => {
      const ctx = resolveContext('update auth logic', makeFingerprint());
      const authFile = ctx.relevantFiles.find((f) => f.path === 'src/middleware/auth.ts');
      expect(authFile).toBeDefined();
      expect(authFile!.reason).toContain('Recently modified');
    });

    it('should give max weight to activeFile', () => {
      const ctx = resolveContext('fix something', makeFingerprint(), 'src/utils/logger.ts');
      const loggerFile = ctx.relevantFiles.find((f) => f.path === 'src/utils/logger.ts');
      expect(loggerFile).toBeDefined();
      expect(loggerFile!.weight).toBe(1.0);
    });

    it('should find UserCard when prompt mentions it', () => {
      const ctx = resolveContext('update the UserCard component', makeFingerprint());
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/components/UserCard.tsx');
    });
  });

  describe('suggested mentions', () => {
    it('should suggest mentioning relevant files not @referenced', () => {
      const ctx = resolveContext('fix the auth', makeFingerprint());
      expect(ctx.suggestedMentions.length).toBeGreaterThan(0);
      expect(ctx.suggestedMentions).toContain('src/middleware/auth.ts');
    });

    it('should not suggest files already @mentioned', () => {
      const ctx = resolveContext('fix @src/middleware/auth.ts JWT validation', makeFingerprint());
      expect(ctx.suggestedMentions).not.toContain('src/middleware/auth.ts');
    });
  });

  describe('stack hints', () => {
    it('should hint about Prisma for database-related prompts', () => {
      const ctx = resolveContext('update the database schema', makeFingerprint());
      expect(ctx.stackHints.some((h) => h.includes('Prisma'))).toBe(true);
    });

    it('should hint about Next.js for route-related prompts', () => {
      const ctx = resolveContext('add a new API endpoint', makeFingerprint());
      expect(ctx.stackHints.some((h) => h.includes('Next.js'))).toBe(true);
    });

    it('should hint about React for component-related prompts', () => {
      const ctx = resolveContext('create a new component', makeFingerprint());
      expect(ctx.stackHints.some((h) => h.includes('React'))).toBe(true);
    });

    it('should NOT hint when technology is already mentioned', () => {
      const ctx = resolveContext('update the Prisma schema migration', makeFingerprint());
      expect(ctx.stackHints.some((h) => h.includes('Prisma'))).toBe(false);
    });

    it('should hint about test runner for test-related prompts', () => {
      const ctx = resolveContext('add tests for the auth module', makeFingerprint());
      expect(ctx.stackHints.some((h) => h.includes('Vitest'))).toBe(true);
    });
  });

  describe('convention conflicts', () => {
    it('should detect jest vs vitest conflict', () => {
      const ctx = resolveContext('write a jest test for login', makeFingerprint());
      expect(ctx.conventionConflicts.length).toBeGreaterThan(0);
      expect(ctx.conventionConflicts[0]).toContain('jest');
      expect(ctx.conventionConflicts[0]).toContain('vitest');
    });

    it('should detect default export conflict', () => {
      const fp = makeFingerprint({
        aiInstructions: 'Always use named exports.\nPrefer named export over default export.',
      });
      const ctx = resolveContext('add a default export for the module', fp);
      expect(ctx.conventionConflicts.some((c) => c.includes('default export'))).toBe(true);
    });

    it('should not flag conflicts when prompt aligns with conventions', () => {
      const ctx = resolveContext('write a vitest test for login', makeFingerprint());
      const jestConflicts = ctx.conventionConflicts.filter((c) => c.includes('jest'));
      expect(jestConflicts).toEqual([]);
    });
  });

  describe('missing constraints', () => {
    it('should detect missing output format in long prompts', () => {
      const ctx = resolveContext(
        'I need you to go through the codebase and find all the places where we handle user sessions and then refactor them to be more consistent across the application',
        makeFingerprint(),
      );
      expect(ctx.missingConstraints.some((c) => c.includes('output format'))).toBe(true);
    });

    it('should detect unspecified error handling', () => {
      const ctx = resolveContext(
        'the login function crashes when the user passes an invalid email address and the token is null or undefined but I am not sure what is going wrong',
        makeFingerprint(),
      );
      expect(ctx.missingConstraints.some((c) => c.includes('error handling'))).toBe(true);
    });

    it('should not flag short prompts for missing constraints', () => {
      const ctx = resolveContext('fix the auth', makeFingerprint());
      expect(ctx.missingConstraints).toEqual([]);
    });
  });

  describe('camelCase splitting (Tier 1B)', () => {
    it('should match "user" files when prompt says "getUserById"', () => {
      const ctx = resolveContext('getUserById returns wrong data', makeFingerprint());
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/models/User.ts');
    });

    it('should match "UserCard" when prompt uses camelCase with "user"', () => {
      const ctx = resolveContext('check the getUserProfile function', makeFingerprint());
      const paths = ctx.relevantFiles.map((f) => f.path);
      // "user" keyword should match User.ts and UserCard.tsx
      expect(paths).toContain('src/models/User.ts');
    });
  });

  describe('synonym matching (Tier 1B)', () => {
    it('should match "authentication" files when prompt says "auth"', () => {
      const fp = makeFingerprint({
        fileTree: [
          {
            name: 'src', path: 'src', type: 'directory', children: [
              { name: 'authentication.ts', path: 'src/authentication.ts', type: 'file' },
            ],
          },
        ],
      });
      const ctx = resolveContext('fix the auth logic', fp);
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/authentication.ts');
    });

    it('should match "utils" files when prompt says "helper"', () => {
      const ctx = resolveContext('update the helper functions in the utils module', makeFingerprint());
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/utils/logger.ts');
    });

    it('should match "config" when prompt says "configuration"', () => {
      const fp = makeFingerprint({
        fileTree: [
          {
            name: 'src', path: 'src', type: 'directory', children: [
              { name: 'config.ts', path: 'src/config.ts', type: 'file' },
            ],
          },
        ],
      });
      const ctx = resolveContext('update the configuration', fp);
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/config.ts');
    });
  });

  describe('symbol resolution (Tier 2C)', () => {
    it('should return empty symbolReferences when no symbolIndex', () => {
      const ctx = resolveContext('fix the UserService', makeFingerprint());
      expect(ctx.symbolReferences).toEqual([]);
    });

    it('should verify symbols found in symbolIndex', () => {
      const fp = makeFingerprint({
        symbolIndex: [
          {
            filePath: 'src/middleware/auth.ts',
            symbols: [
              { name: 'validateToken', kind: 'function', exported: true, signature: 'function validateToken(token: string): boolean' },
            ],
            imports: [],
          },
        ],
      });
      const ctx = resolveContext('fix the validateToken function', fp);
      expect(ctx.symbolReferences).toContainEqual({
        name: 'validateToken',
        filePath: 'src/middleware/auth.ts',
        verified: true,
      });
    });

    it('should mark symbols as unverified when not in symbolIndex', () => {
      const fp = makeFingerprint({
        symbolIndex: [],
      });
      const ctx = resolveContext('fix the NonExistentService class', fp);
      const ref = ctx.symbolReferences.find((s) => s.name === 'NonExistentService');
      expect(ref).toBeDefined();
      expect(ref!.verified).toBe(false);
      expect(ref!.filePath).toBeNull();
    });
  });

  describe('EC7: substring false positive prevention', () => {
    it('should NOT match "auth" to "authorization-handler" (ratio too low)', () => {
      const fp = makeFingerprint({
        fileTree: [
          {
            name: 'src', path: 'src', type: 'directory', children: [
              { name: 'authorization-handler.ts', path: 'src/authorization-handler.ts', type: 'file' },
            ],
          },
        ],
        hotFiles: [],
      });
      const ctx = resolveContext('fix the auth logic', fp);
      const paths = ctx.relevantFiles.map((f) => f.path);
      // "auth" (4 chars) vs "authorization-handler" (21 chars) → ratio 4/21 = 0.19 < 0.6
      expect(paths).not.toContain('src/authorization-handler.ts');
    });

    it('should NOT match synonym "authentication" to "authentication-middleware" stem (exact only)', () => {
      const fp = makeFingerprint({
        fileTree: [
          {
            name: 'src', path: 'src', type: 'directory', children: [
              { name: 'authentication-middleware.ts', path: 'src/authentication-middleware.ts', type: 'file' },
            ],
          },
        ],
        hotFiles: [],
      });
      const ctx = resolveContext('fix the auth logic', fp);
      const paths = ctx.relevantFiles.map((f) => f.path);
      // Synonym "authentication" should only match exact nameStem, not substring of "authentication-middleware"
      expect(paths).not.toContain('src/authentication-middleware.ts');
    });

    it('should still match exact keyword like db === db regardless of length', () => {
      const fp = makeFingerprint({
        fileTree: [
          {
            name: 'src', path: 'src', type: 'directory', children: [
              { name: 'db.ts', path: 'src/db.ts', type: 'file' },
            ],
          },
        ],
        hotFiles: [],
      });
      const ctx = resolveContext('update the db connection', fp);
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/db.ts');
    });
  });

  describe('reference test prompts', () => {
    it('vague prompt should produce suggestions', () => {
      const ctx = resolveContext('fix the auth', makeFingerprint());
      expect(ctx.relevantFiles.length).toBeGreaterThan(0);
      expect(ctx.suggestedMentions.length).toBeGreaterThan(0);
    });

    it('good prompt should have fewer suggestions', () => {
      const goodPrompt = `In @src/middleware/auth.ts, the JWT token validation is returning 401 for valid tokens when the token includes a 'role' claim. Update the validateToken function to extract the role from the decoded payload and include it in the session object. The expected behavior is that GET /api/users returns 200 with the user's role field populated. Use the existing Prisma User model which has a 'role' column.`;
      const ctx = resolveContext(goodPrompt, makeFingerprint());
      // File is already @mentioned, so no suggested mention for it
      expect(ctx.suggestedMentions).not.toContain('src/middleware/auth.ts');
      // Prisma already mentioned, so no Prisma hint
      expect(ctx.stackHints.some((h) => h.includes('Prisma'))).toBe(false);
    });

    it('context-rich prompt should match referenced files', () => {
      const richPrompt = `The UserCard component at @src/components/UserCard.tsx is not showing the user's avatar. The Avatar component from @src/components/ui/Avatar.tsx expects a src prop but UserCard is passing imageUrl instead.`;
      const ctx = resolveContext(richPrompt, makeFingerprint());
      const paths = ctx.relevantFiles.map((f) => f.path);
      expect(paths).toContain('src/components/UserCard.tsx');
    });
  });
});
