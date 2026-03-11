import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { glob } from 'glob';
import type { SessionContext, SessionMessage } from './types.js';
import { log, logError } from '../utils/logger.js';

/** PascalCase/camelCase identifier pattern */
const IDENTIFIER_PATTERN = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+|[a-z]+(?:[A-Z][a-z]+)+)\b/g;

/** @mention pattern */
const AT_MENTION_PATTERN = /@([\w./-]+)/g;

/** Bare path pattern (e.g. src/foo/bar.ts) */
const BARE_PATH_PATTERN = /(?<!\w)([\w-]+(?:\/[\w.-]+){1,})/g;

/**
 * Parses Claude Code JSONL session transcripts to extract
 * multi-turn context for scoring enrichment.
 */
export class SessionParser {
  async parse(
    sessionId?: string,
    workspacePath?: string,
    maxMessages = 10,
    maxAgeMinutes = 30,
  ): Promise<SessionContext | null> {
    // Resolve the session file: explicit ID first, then auto-detect from workspace
    let filePath: string | null = null;
    let resolvedSessionId: string | undefined = sessionId;

    if (sessionId) {
      filePath = await this.findSessionFile(sessionId);
    }

    if (!filePath && workspacePath) {
      const detected = await this.autoDetect(workspacePath);
      if (detected) {
        filePath = detected.filePath;
        resolvedSessionId = detected.sessionId;
        log(`Auto-detected session: ${resolvedSessionId}`);
      }
    }

    if (!filePath || !resolvedSessionId) {
      log(`No session file found (sessionId=${sessionId}, workspace=${workspacePath})`);
      return null;
    }

    try {
      // Read parent session
      const raw = await readFile(filePath, 'utf-8');
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);

      // Read subagent sessions
      const subagentLines = await this.readSubagentFiles(filePath, resolvedSessionId);

      // Merge all lines together and parse
      const allLines = [...lines, ...subagentLines];
      const messages = this.parseMessages(allLines, maxMessages, maxAgeMinutes);

      if (messages.length === 0) return null;

      return this.aggregateContext(messages, resolvedSessionId);
    } catch (err) {
      logError(`Failed to read session file: ${filePath}`, err);
      return null;
    }
  }

  private async findSessionFile(sessionId: string): Promise<string | null> {
    const pattern = `${homedir()}/.claude/projects/*/${sessionId}.jsonl`;
    const matches = await glob(pattern);
    return matches.length > 0 ? matches[0] : null;
  }

  /** Derive the Claude project dir from a workspace path and find the most recent session */
  async autoDetect(workspacePath: string): Promise<{ filePath: string; sessionId: string } | null> {
    const encoded = '-' + workspacePath.substring(1).replaceAll('/', '-');
    const projectDir = join(homedir(), '.claude', 'projects', encoded);

    try {
      const entries = await readdir(projectDir);
      const jsonlFiles = entries.filter((e) => e.endsWith('.jsonl'));

      if (jsonlFiles.length === 0) return null;

      // Sort by modification time, newest first
      const withStats = await Promise.all(
        jsonlFiles.map(async (name) => {
          const fullPath = join(projectDir, name);
          const s = await stat(fullPath);
          return { name, fullPath, mtime: s.mtimeMs };
        }),
      );

      withStats.sort((a, b) => b.mtime - a.mtime);

      const newest = withStats[0];
      const sessionId = basename(newest.name, '.jsonl');

      return { filePath: newest.fullPath, sessionId };
    } catch {
      return null;
    }
  }

  /** Read all subagent JSONL files for a given session */
  private async readSubagentFiles(parentFilePath: string, sessionId: string): Promise<string[]> {
    // Subagents live at: <parentDir>/<sessionId>/subagents/agent-*.jsonl
    const parentDir = parentFilePath.replace(/\/[^/]+\.jsonl$/, '');
    const subagentDir = join(parentDir, sessionId, 'subagents');

    try {
      const entries = await readdir(subagentDir);
      const agentFiles = entries.filter((e) => e.startsWith('agent-') && e.endsWith('.jsonl'));

      if (agentFiles.length === 0) return [];

      log(`Reading ${agentFiles.length} subagent file(s) for session ${sessionId}`);

      const allLines: string[] = [];
      for (const file of agentFiles) {
        try {
          const raw = await readFile(join(subagentDir, file), 'utf-8');
          const lines = raw.split('\n').filter((l) => l.trim().length > 0);
          allLines.push(...lines);
        } catch {
          // Skip unreadable subagent files
        }
      }

      return allLines;
    } catch {
      // No subagents directory — that's fine
      return [];
    }
  }

  private parseMessages(
    lines: string[],
    maxMessages: number,
    maxAgeMinutes: number,
  ): SessionMessage[] {
    // Parse all user messages from the JSONL
    const userMessages: SessionMessage[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== 'user' && entry.type !== 'assistant') continue;

        const content = this.extractContent(entry);
        if (!content) continue;

        const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();

        userMessages.push({
          type: entry.type as 'user' | 'assistant',
          content,
          timestamp,
          filesReferenced: this.extractFileRefs(content),
          symbolsReferenced: this.extractSymbolRefs(content),
        });
      } catch {
        // Skip malformed lines
      }
    }

    if (userMessages.length === 0) return [];

    // Take last N messages
    const recent = userMessages.slice(-maxMessages);

    // Apply time cutoff from the newest message
    const newest = recent[recent.length - 1].timestamp;
    const cutoff = new Date(newest.getTime() - maxAgeMinutes * 60 * 1000);

    return recent
      .filter((m) => m.timestamp >= cutoff)
      .reverse(); // newest first
  }

  private extractContent(entry: Record<string, unknown>): string | null {
    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) return null;

    const content = message.content;
    if (typeof content === 'string') return content;

    // Content can be an array of blocks
    if (Array.isArray(content)) {
      return content
        .filter((block: Record<string, unknown>) => block.type === 'text' && typeof block.text === 'string')
        .map((block: Record<string, unknown>) => block.text as string)
        .join('\n');
    }

    return null;
  }

  private extractFileRefs(content: string): string[] {
    const refs = new Set<string>();

    for (const match of content.matchAll(AT_MENTION_PATTERN)) {
      refs.add(match[1]);
    }
    for (const match of content.matchAll(BARE_PATH_PATTERN)) {
      refs.add(match[1]);
    }

    return [...refs];
  }

  private extractSymbolRefs(content: string): string[] {
    const refs = new Set<string>();

    for (const match of content.matchAll(IDENTIFIER_PATTERN)) {
      refs.add(match[1]);
    }

    return [...refs];
  }

  private aggregateContext(
    messages: SessionMessage[],
    sessionId: string,
  ): SessionContext {
    const allFiles = new Set<string>();
    const allSubjects = new Set<string>();

    for (const msg of messages) {
      for (const f of msg.filesReferenced) allFiles.add(f);
      for (const s of msg.symbolsReferenced) allSubjects.add(s);
    }

    return {
      recentMessages: messages,
      recentFiles: [...allFiles],
      recentSubjects: [...allSubjects],
      messageCount: messages.length,
      sessionId,
    };
  }
}
