/** Parsed from a single JSONL user/assistant line */
export interface SessionMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  filesReferenced: string[];
  symbolsReferenced: string[];
}

/** Aggregated session context for scoring */
export interface SessionContext {
  /** Recent user messages (newest first) */
  recentMessages: SessionMessage[];
  /** Union of all file paths referenced in recent messages */
  recentFiles: string[];
  /** Named subjects (functions, classes, components) from recent messages */
  recentSubjects: string[];
  /** Number of messages analyzed */
  messageCount: number;
  /** Session ID used */
  sessionId: string;
}
