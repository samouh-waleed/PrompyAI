import type { ScoreResult, Suggestion } from './types.js';

const BAR_WIDTH = 14;
const LABEL_WIDTH = 24;
const MAX_SUGGESTIONS = 5;

/**
 * Transforms a ScoreResult into a pre-formatted markdown string
 * for clean display in Claude CLI. Pure function, no side effects.
 */
export function formatDisplay(
  result: Omit<ScoreResult, 'display'>,
  originalPrompt: string,
  sessionFileCount?: number,
): string {
  const lines: string[] = [];

  // Score line
  lines.push(`Prompt Score: ${result.total}/100 [${result.grade}]`);
  if (sessionFileCount && sessionFileCount > 0) {
    lines.push(`Session context: ${sessionFileCount} file reference${sessionFileCount === 1 ? '' : 's'} carried forward`);
  }
  lines.push('');

  // Dimension bars
  const dims = [
    result.dimensions.specificity,
    result.dimensions.context,
    result.dimensions.clarity,
    result.dimensions.anchoring,
  ];
  for (const dim of dims) {
    lines.push(formatDimensionBar(dim.label, dim.score, dim.max));
  }

  // Suggestions section
  const suggestionsBlock = formatSuggestions(result.suggestions, result.grade, result.total);
  if (suggestionsBlock) {
    lines.push('');
    lines.push(suggestionsBlock);
  }

  // Enhanced prompt section
  const enhancedBlock = formatEnhancedPrompt(result.enhancedPrompt, originalPrompt);
  if (enhancedBlock) {
    lines.push('');
    lines.push(enhancedBlock);
  }

  return lines.join('\n');
}

function formatDimensionBar(label: string, score: number, max: number): string {
  const filled = Math.round((score / max) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const bar = '='.repeat(filled) + '.'.repeat(empty);
  const paddedLabel = label.padEnd(LABEL_WIDTH);
  const paddedScore = String(score).padStart(2);
  return `  ${paddedLabel}${paddedScore}/${max}  ${bar}`;
}

function formatSuggestions(
  suggestions: Suggestion[],
  grade: ScoreResult['grade'],
  total: number,
): string {
  if (total === 100) {
    return 'Perfect score. Ship it.';
  }

  if (suggestions.length === 0) {
    if (grade === 'A') return 'Great prompt. No suggestions needed.';
    return '';
  }

  const intro = toneIntro(grade, suggestions.length);
  const items = suggestions.slice(0, MAX_SUGGESTIONS);
  const numbered = items.map((s, i) => {
    let line = `  ${i + 1}. ${s.text}`;
    if (s.example) {
      line += `\n     > ${s.example}`;
    }
    return line;
  });

  return intro + '\n' + numbered.join('\n');
}

function toneIntro(grade: ScoreResult['grade'], count: number): string {
  const plural = count === 1 ? 'suggestion' : 'suggestions';

  switch (grade) {
    case 'A':
      return `Nearly perfect. Minor ${plural}:`;
    case 'B':
      return count === 1
        ? 'Looking good! One suggestion:'
        : `Looking good! A couple of ${plural}:`;
    case 'C':
      return `Suggestions to strengthen this prompt:`;
    case 'D':
      return `This prompt needs work. Key improvements:`;
    case 'F':
      return `This prompt is too vague for good results. Critical fixes:`;
  }
}

function formatEnhancedPrompt(enhanced: string, original: string): string {
  if (enhanced.trim() === original.trim()) {
    return '';
  }

  return `Enhanced prompt:\n\`\`\`\n${enhanced.trim()}\n\`\`\``;
}
