import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionParser } from '../../src/session/SessionParser.js';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock glob to point at our temp dir and homedir for findSessionFile
let tempDir: string;
let sessionDir: string;

describe('SessionParser', () => {
  let parser: SessionParser;

  beforeEach(async () => {
    parser = new SessionParser();
    tempDir = await mkdtemp(join(tmpdir(), 'session-test-'));
    sessionDir = join(tempDir, '.claude', 'projects', 'test-project');
    await mkdir(sessionDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeSessionFile(sessionId: string, lines: unknown[]): Promise<void> {
    const content = lines.map((l) => JSON.stringify(l)).join('\n');
    return writeFile(join(sessionDir, `${sessionId}.jsonl`), content, 'utf-8');
  }

  function mockGlob(sessionId: string) {
    // Mock the glob import to return our temp file
    vi.spyOn(parser as any, 'findSessionFile').mockResolvedValue(
      join(sessionDir, `${sessionId}.jsonl`),
    );
  }

  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

  function userMessage(content: string, timestamp = now) {
    return {
      type: 'user',
      sessionId: 'test-session',
      message: { role: 'user', content },
      timestamp: timestamp.toISOString(),
    };
  }

  function assistantMessage(content: string, timestamp = now) {
    return {
      type: 'assistant',
      sessionId: 'test-session',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: content }],
      },
      timestamp: timestamp.toISOString(),
    };
  }

  it('should parse valid JSONL with user messages', async () => {
    const sessionId = 'session-1';
    await writeSessionFile(sessionId, [
      userMessage('Fix the auth in @src/auth.ts', tenMinAgo),
      assistantMessage('I will fix the auth module.', fiveMinAgo),
      userMessage('Now add tests for that', now),
    ]);
    mockGlob(sessionId);

    const result = await parser.parse(sessionId);
    expect(result).not.toBeNull();
    expect(result!.messageCount).toBe(3); // 2 user + 1 assistant
    expect(result!.recentMessages[0].content).toBe('Now add tests for that');
    expect(result!.recentMessages[1].content).toBe('I will fix the auth module.');
    expect(result!.recentMessages[2].content).toBe('Fix the auth in @src/auth.ts');
  });

  it('should extract file references from @mentions and bare paths', async () => {
    const sessionId = 'session-2';
    await writeSessionFile(sessionId, [
      userMessage('Look at @src/auth.ts and src/middleware/cors.ts'),
    ]);
    mockGlob(sessionId);

    const result = await parser.parse(sessionId);
    expect(result).not.toBeNull();
    expect(result!.recentFiles).toContain('src/auth.ts');
    expect(result!.recentFiles).toContain('src/middleware/cors.ts');
  });

  it('should extract PascalCase/camelCase symbol references', async () => {
    const sessionId = 'session-3';
    await writeSessionFile(sessionId, [
      userMessage('Fix the UserService and validateToken function'),
    ]);
    mockGlob(sessionId);

    const result = await parser.parse(sessionId);
    expect(result).not.toBeNull();
    expect(result!.recentSubjects).toContain('UserService');
    expect(result!.recentSubjects).toContain('validateToken');
  });

  it('should respect maxMessages limit', async () => {
    const sessionId = 'session-4';
    const messages = Array.from({ length: 20 }, (_, i) =>
      userMessage(`Message ${i}`, new Date(now.getTime() - i * 60 * 1000)),
    );
    await writeSessionFile(sessionId, messages);
    mockGlob(sessionId);

    const result = await parser.parse(sessionId, undefined, 5);
    expect(result).not.toBeNull();
    expect(result!.messageCount).toBe(5);
  });

  it('should respect time cutoff', async () => {
    const sessionId = 'session-5';
    const oldTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    await writeSessionFile(sessionId, [
      userMessage('Old message', oldTime),
      userMessage('Recent message', now),
    ]);
    mockGlob(sessionId);

    const result = await parser.parse(sessionId, undefined, 10, 30);
    expect(result).not.toBeNull();
    expect(result!.messageCount).toBe(1);
    expect(result!.recentMessages[0].content).toBe('Recent message');
  });

  it('should return null when file not found', async () => {
    vi.spyOn(parser as any, 'findSessionFile').mockResolvedValue(null);
    const result = await parser.parse('nonexistent');
    expect(result).toBeNull();
  });

  it('should handle malformed JSONL lines gracefully', async () => {
    const sessionId = 'session-6';
    const content = [
      JSON.stringify(userMessage('Valid message')),
      '{ invalid json !!!',
      JSON.stringify(userMessage('Another valid message')),
    ].join('\n');
    await writeFile(join(sessionDir, `${sessionId}.jsonl`), content, 'utf-8');
    mockGlob(sessionId);

    const result = await parser.parse(sessionId);
    expect(result).not.toBeNull();
    expect(result!.messageCount).toBe(2);
  });

  it('should ignore file-history-snapshot entries', async () => {
    const sessionId = 'session-7';
    await writeSessionFile(sessionId, [
      { type: 'file-history-snapshot', messageId: 'snap-1', snapshot: {} },
      userMessage('Real message'),
    ]);
    mockGlob(sessionId);

    const result = await parser.parse(sessionId);
    expect(result).not.toBeNull();
    expect(result!.messageCount).toBe(1);
  });

  it('should return null for empty JSONL', async () => {
    const sessionId = 'session-8';
    await writeFile(join(sessionDir, `${sessionId}.jsonl`), '', 'utf-8');
    mockGlob(sessionId);

    const result = await parser.parse(sessionId);
    expect(result).toBeNull();
  });

  it('should deduplicate file and symbol references across messages', async () => {
    const sessionId = 'session-9';
    await writeSessionFile(sessionId, [
      userMessage('Check @src/auth.ts and UserService'),
      userMessage('Also look at @src/auth.ts and UserService again'),
    ]);
    mockGlob(sessionId);

    const result = await parser.parse(sessionId);
    expect(result).not.toBeNull();
    const authCount = result!.recentFiles.filter((f) => f === 'src/auth.ts').length;
    expect(authCount).toBe(1);
    const serviceCount = result!.recentSubjects.filter((s) => s === 'UserService').length;
    expect(serviceCount).toBe(1);
  });

  describe('subagent reading', () => {
    it('should include file refs and symbols from subagent messages', async () => {
      const sessionId = 'session-sub-1';

      // Write parent session
      await writeSessionFile(sessionId, [
        userMessage('Fix the auth module', tenMinAgo),
      ]);

      // Write subagent file in the expected directory structure
      const subagentDir = join(sessionDir, sessionId, 'subagents');
      await mkdir(subagentDir, { recursive: true });
      const subagentContent = [
        JSON.stringify(userMessage('Explore @src/middleware/auth.ts and AuthController', fiveMinAgo)),
        JSON.stringify(assistantMessage('Found AuthController in src/middleware/auth.ts with validateToken method', fiveMinAgo)),
      ].join('\n');
      await writeFile(join(subagentDir, 'agent-abc123.jsonl'), subagentContent, 'utf-8');

      mockGlob(sessionId);

      const result = await parser.parse(sessionId);
      expect(result).not.toBeNull();
      // Should include refs from both parent and subagent
      expect(result!.recentFiles).toContain('src/middleware/auth.ts');
      expect(result!.recentSubjects).toContain('AuthController');
      expect(result!.recentSubjects).toContain('validateToken');
    });

    it('should merge messages from multiple subagents', async () => {
      const sessionId = 'session-sub-2';

      await writeSessionFile(sessionId, [
        userMessage('Implement feature X', tenMinAgo),
      ]);

      const subagentDir = join(sessionDir, sessionId, 'subagents');
      await mkdir(subagentDir, { recursive: true });

      // Subagent 1: explores files
      await writeFile(
        join(subagentDir, 'agent-explore1.jsonl'),
        JSON.stringify(assistantMessage('Found @src/api/routes.ts relevant', fiveMinAgo)),
        'utf-8',
      );

      // Subagent 2: explores different files
      await writeFile(
        join(subagentDir, 'agent-explore2.jsonl'),
        JSON.stringify(assistantMessage('Found @src/db/models.ts and UserModel', fiveMinAgo)),
        'utf-8',
      );

      mockGlob(sessionId);

      const result = await parser.parse(sessionId);
      expect(result).not.toBeNull();
      expect(result!.recentFiles).toContain('src/api/routes.ts');
      expect(result!.recentFiles).toContain('src/db/models.ts');
      expect(result!.recentSubjects).toContain('UserModel');
    });

    it('should work fine when no subagents directory exists', async () => {
      const sessionId = 'session-sub-3';
      await writeSessionFile(sessionId, [
        userMessage('Simple message with no subagents'),
      ]);
      mockGlob(sessionId);

      const result = await parser.parse(sessionId);
      expect(result).not.toBeNull();
      expect(result!.messageCount).toBe(1);
    });
  });

  describe('autoDetect', () => {
    function mockAutoDetect(sessionId: string | null) {
      if (sessionId) {
        vi.spyOn(parser as any, 'autoDetect').mockResolvedValue({
          filePath: join(sessionDir, `${sessionId}.jsonl`),
          sessionId,
        });
      } else {
        vi.spyOn(parser as any, 'autoDetect').mockResolvedValue(null);
      }
    }

    it('should auto-detect via parse() when no sessionId given', async () => {
      const sessionId = 'auto-detected';
      await writeSessionFile(sessionId, [
        userMessage('Auto detected message'),
      ]);
      mockAutoDetect(sessionId);

      const result = await parser.parse(undefined, '/some/workspace');
      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe('auto-detected');
      expect(result!.recentMessages[0].content).toBe('Auto detected message');
    });

    it('should return null when auto-detect finds nothing', async () => {
      mockAutoDetect(null);

      const result = await parser.parse(undefined, '/nonexistent/workspace');
      expect(result).toBeNull();
    });

    it('should prefer explicit sessionId over auto-detect', async () => {
      const explicitId = 'explicit-session';
      const autoId = 'auto-session';
      await writeSessionFile(explicitId, [userMessage('Explicit message')]);
      await writeSessionFile(autoId, [userMessage('Auto message')]);

      mockGlob(explicitId);
      mockAutoDetect(autoId);

      const result = await parser.parse(explicitId, '/some/workspace');
      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe('explicit-session');
    });

    it('should return null when neither sessionId nor workspacePath given', async () => {
      const result = await parser.parse();
      expect(result).toBeNull();
    });
  });
});
