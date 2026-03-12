import Anthropic from '@anthropic-ai/sdk';
import type { ProjectFingerprint } from '../indexer/types.js';
import type { FileSnippet, FiredRule, HeuristicResult, ResolvedContext, Suggestion } from './types.js';
import { log, logError } from '../utils/logger.js';

export interface AIGeneratorOutput {
  suggestions: Suggestion[];
  enhancedPrompt: string;
  aiGenerated: boolean;
}

const TIMEOUT_MS = 5000;

/**
 * Layer 2: AI-powered suggestion generator using Claude Haiku.
 * Produces natural-language suggestions and enhanced prompts grounded
 * in the heuristic analysis + real project context.
 *
 * Fallback layers:
 * 1. No API key → template-based from fired rules
 * 2. Timeout (5s) → template-based
 * 3. Malformed JSON → template-based
 */
export class AISuggestionGenerator {
  private client: Anthropic | null = null;
  private model: string;

  constructor(model = 'claude-haiku-4-5-20251001') {
    this.model = model;
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic();
      log('AI suggestion generator initialized with Claude Haiku');
    } else {
      log('No ANTHROPIC_API_KEY — using template-based suggestions');
    }
  }

  async generate(
    prompt: string,
    fingerprint: ProjectFingerprint,
    context: ResolvedContext,
    heuristic: HeuristicResult,
    fileSnippets: FileSnippet[] = [],
  ): Promise<AIGeneratorOutput> {
    if (!this.client) {
      return this.buildTemplateFallback(prompt, heuristic, context);
    }

    try {
      return await this.callAI(prompt, fingerprint, context, heuristic, fileSnippets);
    } catch (err) {
      logError('AI suggestion generation failed, using template fallback', err);
      return this.buildTemplateFallback(prompt, heuristic, context);
    }
  }

  private async callAI(
    prompt: string,
    fingerprint: ProjectFingerprint,
    context: ResolvedContext,
    heuristic: HeuristicResult,
    fileSnippets: FileSnippet[] = [],
  ): Promise<AIGeneratorOutput> {
    const systemPrompt = this.buildSystemPrompt(fingerprint, context, heuristic, fileSnippets);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await this.client!.messages.create(
        {
          model: this.model,
          max_tokens: 800,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Original developer prompt:\n\n"${prompt}"\n\nGenerate suggestions and an enhanced prompt. Respond with JSON only.`,
            },
          ],
        },
        { signal: controller.signal },
      );

      clearTimeout(timeout);

      const text = response.content?.[0];
      if (!text || text.type !== 'text') {
        return this.buildTemplateFallback(prompt, heuristic);
      }

      return this.parseAIResponse(text.text, prompt, heuristic);
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  private buildSystemPrompt(
    fingerprint: ProjectFingerprint,
    context: ResolvedContext,
    heuristic: HeuristicResult,
    fileSnippets: FileSnippet[] = [],
  ): string {
    const penalties = heuristic.firedRules.filter((r) => r.type === 'penalty');
    const rulesText = penalties.length > 0
      ? penalties.map((r) => `- ${r.ruleId} (${r.dimension}, -${r.points}pts): ${JSON.stringify(r.detail)}`).join('\n')
      : 'No penalties fired — the prompt is already well-structured.';

    const relevantFilesText = context.relevantFiles.length > 0
      ? context.relevantFiles.slice(0, 5).map((f) => `  ${f.path} (relevance: ${f.weight.toFixed(2)})`).join('\n')
      : '  None identified';

    const stackInfo = [
      `Language: ${fingerprint.stack.language}`,
      fingerprint.stack.framework ? `Framework: ${fingerprint.stack.framework}` : null,
      fingerprint.stack.orm ? `ORM: ${fingerprint.stack.orm}` : null,
      fingerprint.stack.testRunner ? `Test runner: ${fingerprint.stack.testRunner}` : null,
    ].filter(Boolean).join(', ');

    // File content snippets
    const snippetsText = fileSnippets.length > 0
      ? fileSnippets.map((s) => `--- ${s.path} ---\n${s.content}`).join('\n\n')
      : '';

    // Code symbols from symbol index
    const symbolsText = fingerprint.symbolIndex && fingerprint.symbolIndex.length > 0
      ? fingerprint.symbolIndex
          .filter((fs) => context.relevantFiles.some((rf) => rf.path === fs.filePath))
          .slice(0, 5)
          .map((fs) => {
            const sigs = fs.symbols
              .filter((s) => s.exported)
              .slice(0, 10)
              .map((s) => `  ${s.signature ?? `${s.kind} ${s.name}`}`)
              .join('\n');
            return `--- ${fs.filePath} ---\n${sigs}`;
          })
          .join('\n\n')
      : '';

    // Verified vs unverified symbol references
    const verifiedSymbols = context.symbolReferences.filter((s) => s.verified);
    const unverifiedSymbols = context.symbolReferences.filter((s) => !s.verified);
    const symbolRefText = [
      verifiedSymbols.length > 0 ? `- Verified symbol references: ${verifiedSymbols.map((s) => `${s.name} (in ${s.filePath})`).join(', ')}` : '',
      unverifiedSymbols.length > 0 ? `- Unverified symbol references: ${unverifiedSymbols.map((s) => s.name).join(', ')} (not found in codebase)` : '',
    ].filter(Boolean).join('\n');

    return `You are a prompt quality coach for developers using AI coding assistants.

PROJECT CONTEXT:
- Tech stack: ${stackInfo}
- Key folders: ${fingerprint.keyFolders.join(', ') || 'none detected'}
- Relevant files:\n${relevantFilesText}
${context.suggestedMentions.length > 0 ? `- Unmentioned but relevant: ${context.suggestedMentions.join(', ')}` : ''}
${context.stackHints.length > 0 ? `- Stack hints: ${context.stackHints.join('; ')}` : ''}
${symbolRefText}
${snippetsText ? `\nFILE CONTENTS:\n${snippetsText}` : ''}
${symbolsText ? `\nCODE SYMBOLS:\n${symbolsText}` : ''}

HEURISTIC ANALYSIS (score: ${heuristic.total}/100, grade: ${heuristic.grade}):
${rulesText}

TASK: Generate actionable suggestions to improve the developer's prompt, plus an enhanced version.

Respond ONLY with valid JSON (no markdown fences, no explanation):
{
  "suggestions": [
    { "priority": "high"|"medium"|"low", "dimension": "specificity"|"context"|"clarity"|"anchoring", "text": "what to improve", "example": "concrete example" }
  ],
  "enhancedPrompt": "the improved prompt text"
}

Rules:
- Max 5 suggestions, sorted by impact
- Each suggestion must be specific to THIS project and prompt
- The enhanced prompt should incorporate ALL suggestions
- Reference actual file paths, code symbols, and project entities
- Keep the enhanced prompt concise — don't pad with fluff`;
  }

  private parseAIResponse(
    raw: string,
    originalPrompt: string,
    heuristic: HeuristicResult,
  ): AIGeneratorOutput {
    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*\n?/m, '')
      .replace(/\n?```\s*$/m, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as AIGeneratorOutput;

      // Validate structure
      if (!Array.isArray(parsed.suggestions) || typeof parsed.enhancedPrompt !== 'string') {
        return this.buildTemplateFallback(originalPrompt, heuristic);
      }

      // Validate each suggestion
      const validSuggestions = parsed.suggestions.filter(
        (s) =>
          ['high', 'medium', 'low'].includes(s.priority) &&
          ['specificity', 'context', 'clarity', 'anchoring'].includes(s.dimension) &&
          typeof s.text === 'string',
      );

      return {
        suggestions: validSuggestions.slice(0, 5),
        enhancedPrompt: parsed.enhancedPrompt || originalPrompt,
        aiGenerated: true,
      };
    } catch {
      logError('Failed to parse AI response as JSON');
      return this.buildTemplateFallback(originalPrompt, heuristic);
    }
  }

  buildTemplateFallback(
    originalPrompt: string,
    heuristic: HeuristicResult,
    context?: ResolvedContext,
  ): AIGeneratorOutput {
    const suggestions: Suggestion[] = [];

    for (const rule of heuristic.firedRules) {
      if (rule.type !== 'penalty') continue;
      suggestions.push(ruleToSuggestion(rule));
    }

    // Sort by priority and limit
    const sorted = suggestions.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    }).slice(0, 5);

    const enhancedPrompt = buildSmartEnhancedPrompt(originalPrompt, heuristic, sorted, context);

    return { suggestions: sorted, enhancedPrompt, aiGenerated: false };
  }
}

function ruleToSuggestion(rule: FiredRule): Suggestion {
  const priority = rule.points >= 5 ? 'high' : rule.points >= 3 ? 'medium' : 'low';

  const templates: Record<string, { text: string; example?: string }> = {
    vague_verb_unqualified: {
      text: 'Replace vague verbs with specific actions — no context follows the verb',
      example: 'Instead of "fix the auth", say "debug the JWT validation error in the login endpoint"',
    },
    vague_verb_qualified: {
      text: 'Consider replacing vague verbs even when context is nearby',
      example: 'Instead of "fix @src/auth.ts", say "debug the JWT validation in @src/auth.ts"',
    },
    no_output_format: {
      text: 'Specify what format you expect the output in',
      example: 'Add "as a TypeScript function" or "return a JSON object with..."',
    },
    no_quantitative_constraint: {
      text: 'Add specific numbers or constraints',
      example: 'Specify limits like "max 3 retries" or "paginate with 20 items per page"',
    },
    short_prompt: {
      text: 'Expand your prompt with more context — short prompts lead to generic output',
      example: 'Include what file you\'re working in, what behavior you expect, and any constraints',
    },
    unmentioned_relevant_files: {
      text: `Reference relevant files with @mentions: ${rule.detail.files ?? ''}`,
      example: `Add @${rule.detail.files?.split(', ')[0] ?? 'path/to/file'} to your prompt`,
    },
    orm_no_model: {
      text: 'Mention the specific model/schema name when working with the database',
      example: 'Reference the model name, e.g. "update the User model" or "add a field to the Post schema"',
    },
    fix_without_current_behavior: {
      text: 'Describe what currently happens and what should happen instead',
      example: 'Add "currently returns 500, should return 401 when token is expired"',
    },
    multiple_tasks: {
      text: 'Break this into separate, focused prompts — one task per prompt',
      example: 'Send each task as its own prompt for better results',
    },
    no_success_criteria: {
      text: 'Add acceptance criteria — how will you know it\'s done?',
      example: 'Add "it should return..." or "the test must pass when..."',
    },
    convention_conflict: {
      text: `Your prompt conflicts with project conventions: ${rule.detail.conflicts ?? ''}`,
    },
    ambiguous_pronouns: {
      text: 'Replace "it", "that", "this" with specific names',
      example: 'Instead of "fix it", say "fix the validateToken function"',
    },
    no_file_paths: {
      text: 'Add file paths using @mentions to anchor your prompt to the codebase',
      example: 'Start with @src/path/to/file.ts to give context',
    },
    entity_not_pathed: {
      text: 'You mention project entities — add their full file paths for clarity',
    },
    nonexistent_file_ref: {
      text: `File path "${rule.detail.path ?? ''}" doesn't exist in the project — check the path`,
    },
    verified_symbol_ref: {
      text: 'Good — your prompt references real code symbols from the project',
    },
    nonexistent_symbol_ref: {
      text: `Symbol "${rule.detail.symbols ?? ''}" not found in the codebase — verify the name`,
      example: 'Check the exact function/class name in the source file',
    },
    symbol_file_mismatch: {
      text: `Symbol "${rule.detail.symbol ?? ''}" is in ${rule.detail.actualFile ?? 'a different file'} — update the file reference`,
      example: `Reference @${rule.detail.actualFile ?? 'correct/path'} instead`,
    },
  };

  const tmpl = templates[rule.ruleId] ?? {
    text: `Address ${rule.ruleId} in the ${rule.dimension} dimension`,
  };

  return {
    priority,
    dimension: rule.dimension,
    text: tmpl.text,
    example: tmpl.example,
  };
}

/**
 * Builds an enhanced prompt by weaving in real project context
 * (file paths, symbols, session files) rather than appending generic advice.
 */
function buildSmartEnhancedPrompt(
  original: string,
  heuristic: HeuristicResult,
  suggestions: Suggestion[],
  context?: ResolvedContext,
): string {
  const parts: string[] = [];

  // Start with the original prompt
  parts.push(original.trim());

  // Identify what's missing and inject real context
  const firedIds = new Set(heuristic.firedRules.map((r) => r.ruleId));

  // Inject file paths if missing
  if (firedIds.has('no_file_paths') || firedIds.has('entity_not_pathed')) {
    const topFiles = context?.relevantFiles
      .filter((f) => f.weight >= 0.5 && f.reason !== 'Referenced in prior session messages')
      .slice(0, 3)
      .map((f) => `@${f.path}`);
    if (topFiles && topFiles.length > 0) {
      parts.push(`\nRelevant files: ${topFiles.join(', ')}`);
    }
  }

  // Inject success criteria if missing (and not already present from a prior enhancement)
  if (firedIds.has('no_success_criteria') && !/\bshould\b.*\b(return|pass|produce)\b/i.test(original)) {
    const testRunner = context?.stackHints.find((h) => /test runner/i.test(h));
    if (testRunner) {
      parts.push(`Ensure existing tests still pass.`);
    } else {
      parts.push(`The change should [describe expected outcome].`);
    }
  }

  // Inject expected/actual if "fix" without behavior (and not already present)
  if ((firedIds.has('fix_without_current_behavior') || firedIds.has('fix_without_current_behavior_session'))
      && !/Current behavior:/i.test(original)) {
    parts.push(`Current behavior: [describe what happens now]. Expected: [describe what should happen].`);
  }

  // Inject verified symbols for clarity (and not already present)
  const verifiedSymbols = context?.symbolReferences.filter((s) => s.verified).slice(0, 3);
  if (verifiedSymbols && verifiedSymbols.length > 0 && firedIds.has('vague_verb_unqualified')
      && !/Relevant code:/i.test(original)) {
    const symbolList = verifiedSymbols.map((s) => `\`${s.name}\` in ${s.filePath}`).join(', ');
    parts.push(`Relevant code: ${symbolList}`);
  }

  // If the enhanced prompt is identical, it means no rules fired — return as-is
  const enhanced = parts.join('\n');
  return enhanced === original.trim() ? original : enhanced;
}
