import type { ProjectFingerprint } from '../indexer/types.js';
import type { SessionContext } from '../session/types.js';
import type { FileSnippet, HeuristicResult, ResolvedContext, ScoreResult } from './types.js';
import { WorkspaceIndexer } from '../indexer/WorkspaceIndexer.js';
import { HeuristicScorer } from './HeuristicScorer.js';
import { AISuggestionGenerator } from './AISuggestionGenerator.js';
import { resolveContext } from './ContextResolver.js';
import { formatDisplay } from './DisplayFormatter.js';

/**
 * Orchestrates the full scoring pipeline:
 * 1. Resolve context (map prompt to fingerprint) — sync, fast
 * 2. Run heuristic scoring (4 dimensions) — sync, <10ms
 * 3. Read file snippets from top relevant files — async, ~1ms
 * 4. Generate AI suggestions + enhanced prompt — async, ~500ms
 * 5. Assemble ScoreResult
 */
export class ScoringEngine {
  private heuristic = new HeuristicScorer();
  private aiGenerator: AISuggestionGenerator;
  private indexer = new WorkspaceIndexer();

  constructor(model?: string) {
    this.aiGenerator = new AISuggestionGenerator(model);
  }

  async evaluate(
    prompt: string,
    fingerprint: ProjectFingerprint,
    activeFile?: string,
    sessionContext?: SessionContext,
    llmAllowed = true,
  ): Promise<ScoreResult> {
    // Step 1: Resolve context
    const context = resolveContext(prompt, fingerprint, activeFile, sessionContext);

    // Step 2: Heuristic scoring
    const heuristic = this.heuristic.score(prompt, fingerprint, context, sessionContext);

    // Step 3: Read file snippets from top 3 relevant files
    const fileSnippets = await this.readFileSnippets(fingerprint, context.relevantFiles);

    // Step 4: AI-powered suggestions + enhanced prompt
    // Skip LLM call if rate limited — use template fallback
    const aiOutput = llmAllowed
      ? await this.aiGenerator.generate(prompt, fingerprint, context, heuristic, fileSnippets)
      : this.aiGenerator.buildTemplateFallback(prompt, heuristic, context);

    // Step 5: Assemble result
    const partial = {
      total: heuristic.total,
      grade: heuristic.grade,
      dimensions: heuristic.dimensions,
      suggestions: aiOutput.suggestions,
      enhancedPrompt: aiOutput.enhancedPrompt,
      scoredAt: new Date(),
    };

    const result: ScoreResult = {
      ...partial,
      display: formatDisplay(partial, prompt, sessionContext?.recentFiles.length),
    };

    if (!aiOutput.aiGenerated) {
      result.claudeInstructions = buildClaudeInstructions(prompt, context, heuristic);
    }

    return result;
  }

  private async readFileSnippets(
    fingerprint: ProjectFingerprint,
    relevantFiles: { path: string; weight: number }[],
  ): Promise<FileSnippet[]> {
    const top = relevantFiles.slice(0, 3);
    const snippets: FileSnippet[] = [];

    for (const file of top) {
      const content = await this.indexer.readFileSnippet(
        fingerprint.workspacePath,
        file.path,
        500,
      );
      if (content) {
        snippets.push({ path: file.path, content });
      }
    }

    return snippets;
  }
}

function buildClaudeInstructions(
  prompt: string,
  context: ResolvedContext,
  heuristic: HeuristicResult,
): string {
  const penalties = heuristic.firedRules.filter((r) => r.type === 'penalty');
  const relevantFiles = context.relevantFiles.slice(0, 5);
  const verifiedSymbols = context.symbolReferences.filter((s) => s.verified);

  const parts: string[] = [
    `ENHANCED PROMPT REQUEST: The enhanced prompt above was template-generated because no ANTHROPIC_API_KEY is set. You (Claude) should generate a better enhanced prompt for the user using the codebase context below.`,
    ``,
    `ORIGINAL PROMPT: "${prompt}"`,
  ];

  if (penalties.length > 0) {
    parts.push(``, `ISSUES FOUND:`);
    for (const r of penalties) {
      parts.push(`- [${r.dimension}] ${r.ruleId}: ${JSON.stringify(r.detail)}`);
    }
  }

  if (relevantFiles.length > 0) {
    parts.push(``, `RELEVANT FILES:`);
    for (const f of relevantFiles) {
      parts.push(`- ${f.path} (relevance: ${f.weight.toFixed(2)}, reason: ${f.reason})`);
    }
  }

  if (verifiedSymbols.length > 0) {
    parts.push(``, `VERIFIED SYMBOLS:`);
    for (const s of verifiedSymbols) {
      parts.push(`- ${s.name} in ${s.filePath}`);
    }
  }

  if (context.stackHints.length > 0) {
    parts.push(``, `STACK HINTS: ${context.stackHints.join('; ')}`);
  }

  if (context.suggestedMentions.length > 0) {
    parts.push(``, `SUGGESTED @MENTIONS: ${context.suggestedMentions.join(', ')}`);
  }

  parts.push(``, `Rewrite the original prompt to incorporate these improvements. Be concise and actionable. Reference real file paths and symbols. Show the enhanced prompt to the user in a code block they can copy.`);

  return parts.join('\n');
}
