// Public API — for programmatic usage of prompyai-mcp as a library

export type {
  ProjectFingerprint,
  TechStack,
  FileNode,
  FileSymbols,
  SymbolInfo,
  ImportInfo,
} from './indexer/types.js';

export type {
  ScoreResult,
  DimensionScore,
  Suggestion,
  ResolvedContext,
  FiredRule,
  HeuristicResult,
  FileSnippet,
  SymbolReference,
} from './scorer/types.js';

export { WorkspaceIndexer } from './indexer/WorkspaceIndexer.js';
export { ScoringEngine } from './scorer/ScoringEngine.js';
