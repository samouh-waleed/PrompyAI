export interface DimensionScore {
  score: number;
  max: number;
  label: string;
  penalties: string[];
  bonuses: string[];
}

export interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  dimension: 'specificity' | 'context' | 'clarity' | 'anchoring';
  text: string;
  example?: string;
}

export interface ScoreResult {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: {
    specificity: DimensionScore;
    context: DimensionScore;
    clarity: DimensionScore;
    anchoring: DimensionScore;
  };
  suggestions: Suggestion[];
  enhancedPrompt: string;
  display: string;
  scoredAt: Date;
  claudeInstructions?: string;
}

export interface FileSnippet {
  path: string;
  content: string;
}

export interface SymbolReference {
  name: string;
  filePath: string | null;
  verified: boolean;
}

export interface ResolvedContext {
  relevantFiles: { path: string; reason: string; weight: number }[];
  suggestedMentions: string[];
  stackHints: string[];
  conventionConflicts: string[];
  missingConstraints: string[];
  symbolReferences: SymbolReference[];
  sessionFiles?: string[];
  hasSessionContext?: boolean;
}

export interface FiredRule {
  ruleId: string;
  dimension: 'specificity' | 'context' | 'clarity' | 'anchoring';
  type: 'penalty' | 'bonus';
  points: number;
  detail: Record<string, string>;
}

export interface HeuristicResult {
  dimensions: {
    specificity: DimensionScore;
    context: DimensionScore;
    clarity: DimensionScore;
    anchoring: DimensionScore;
  };
  firedRules: FiredRule[];
  total: number;
  grade: ScoreResult['grade'];
}
