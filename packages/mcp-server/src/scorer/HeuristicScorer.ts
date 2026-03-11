import type { ProjectFingerprint } from '../indexer/types.js';
import type { SessionContext } from '../session/types.js';
import type { DimensionScore, FiredRule, HeuristicResult, ResolvedContext } from './types.js';

/**
 * Layer 1: Rule-based scoring engine. Runs entirely in-process, <10ms.
 *
 * Four dimensions, each 0–25 points (starting at 15 midpoint):
 * 1. Specificity — concrete vs vague information
 * 2. Context Completeness — does the AI have what it needs?
 * 3. Task Clarity — unambiguous, well-scoped goal
 * 4. File & Folder Anchoring — grounded in actual project structure
 */
export class HeuristicScorer {
  private static MIDPOINT = 15;

  score(
    prompt: string,
    fingerprint: ProjectFingerprint,
    context: ResolvedContext,
    sessionContext?: SessionContext,
  ): HeuristicResult {
    const firedRules: FiredRule[] = [];

    const specificity = this.scoreSpecificity(prompt, context, firedRules);
    const contextDim = this.scoreContextCompleteness(prompt, fingerprint, context, firedRules, sessionContext);
    const clarity = this.scoreTaskClarity(prompt, fingerprint, context, firedRules, sessionContext);
    const anchoring = this.scoreAnchoring(prompt, fingerprint, context, firedRules, sessionContext);

    const total = specificity.score + contextDim.score + clarity.score + anchoring.score;

    return {
      dimensions: {
        specificity,
        context: contextDim,
        clarity,
        anchoring,
      },
      firedRules,
      total,
      grade: this.toGrade(total),
    };
  }

  private scoreSpecificity(
    prompt: string,
    context: ResolvedContext,
    firedRules: FiredRule[],
  ): DimensionScore {
    let score = HeuristicScorer.MIDPOINT;
    const penalties: string[] = [];
    const bonuses: string[] = [];

    // Penalty: vague verbs (context-aware)
    // Strip quoted/code content so example vague verbs don't count
    const strippedForVagueVerbs = stripQuotedContent(prompt);
    const vagueVerbPattern = /\b(fix|help|make|do|update|improve|handle)\b/gi;
    const vagueMatches = [...strippedForVagueVerbs.matchAll(vagueVerbPattern)];
    if (vagueMatches.length > 0) {
      let qualifiedCount = 0;
      let unqualifiedCount = 0;

      for (const match of vagueMatches) {
        const pos = match.index!;
        const nearby = strippedForVagueVerbs.slice(Math.max(0, pos - 80), pos + 60);
        const hasQualifier =
          /@[\w./-]+/.test(nearby) ||                            // @file reference
          /(?:src|lib|app|api)\/[\w./-]+/.test(nearby) ||       // bare path
          hasPascalCaseIdentifier(nearby) ||                      // PascalCase identifier (not a tech name)
          /[`"'][\w\s./-]+[`"']/.test(nearby);                  // quoted/backtick string

        if (hasQualifier) {
          qualifiedCount++;
        } else {
          unqualifiedCount++;
        }
      }

      if (qualifiedCount > 0) {
        const pts = qualifiedCount * 1;
        score -= pts;
        penalties.push(`Vague verbs (qualified): ${qualifiedCount} (-${pts}pts)`);
        firedRules.push({
          ruleId: 'vague_verb_qualified',
          dimension: 'specificity',
          type: 'penalty',
          points: pts,
          detail: { count: String(qualifiedCount) },
        });
      }

      if (unqualifiedCount > 0) {
        const pts = unqualifiedCount * 3;
        score -= pts;
        penalties.push(`Vague verbs (unqualified): ${unqualifiedCount} (-${pts}pts)`);
        firedRules.push({
          ruleId: 'vague_verb_unqualified',
          dimension: 'specificity',
          type: 'penalty',
          points: pts,
          detail: { count: String(unqualifiedCount) },
        });
      }
    }

    // Penalty: no output format
    const formatKeywords = /\b(json|csv|table|list|markdown|html|yaml|xml|function|class|component|type|interface|endpoint|api|hook|module|return|test)\b/i;
    if (!formatKeywords.test(prompt)) {
      score -= 4;
      penalties.push('No output format specified (-4pts)');
      firedRules.push({
        ruleId: 'no_output_format',
        dimension: 'specificity',
        type: 'penalty',
        points: 4,
        detail: {},
      });
    } else {
      score += 3;
      bonuses.push('Output format stated (+3pts)');
      firedRules.push({
        ruleId: 'output_format_stated',
        dimension: 'specificity',
        type: 'bonus',
        points: 3,
        detail: {},
      });
    }

    // Penalty: no quantitative constraint
    const hasNumbers = /\b\d+\b/.test(prompt);
    const hasLimits = /\b(max|min|limit|at least|at most|no more than|up to)\b/i.test(prompt);
    if (!hasNumbers && !hasLimits) {
      score -= 2;
      penalties.push('No quantitative constraints (-2pts)');
      firedRules.push({
        ruleId: 'no_quantitative_constraint',
        dimension: 'specificity',
        type: 'penalty',
        points: 2,
        detail: {},
      });
    } else {
      score += 2;
      bonuses.push('Quantitative constraint present (+2pts)');
      firedRules.push({
        ruleId: 'quantitative_constraint',
        dimension: 'specificity',
        type: 'bonus',
        points: 2,
        detail: {},
      });
    }

    // Penalty: short prompt
    const wordCount = prompt.trim().split(/\s+/).length;
    if (wordCount < 8) {
      score -= 6;
      penalties.push(`Short prompt: ${wordCount} words (-6pts)`);
      firedRules.push({
        ruleId: 'short_prompt',
        dimension: 'specificity',
        type: 'penalty',
        points: 6,
        detail: { wordCount: String(wordCount) },
      });
    }

    // Bonus: verified symbol references (Tier 2D)
    const verifiedSymbols = context.symbolReferences.filter((s) => s.verified);
    if (verifiedSymbols.length > 0) {
      const pts = Math.min(verifiedSymbols.length * 3, 9);
      score += pts;
      bonuses.push(`Verified symbol references: ${verifiedSymbols.map((s) => s.name).join(', ')} (+${pts}pts)`);
      firedRules.push({
        ruleId: 'verified_symbol_ref',
        dimension: 'specificity',
        type: 'bonus',
        points: pts,
        detail: { symbols: verifiedSymbols.map((s) => s.name).join(', '), count: String(verifiedSymbols.length) },
      });
    }

    // Penalty: nonexistent symbol references (Tier 2D)
    const unverifiedSymbols = context.symbolReferences.filter((s) => !s.verified);
    if (unverifiedSymbols.length > 0) {
      const pts = Math.min(unverifiedSymbols.length * 2, 6);
      score -= pts;
      penalties.push(`Unverified symbol references: ${unverifiedSymbols.map((s) => s.name).join(', ')} (-${pts}pts)`);
      firedRules.push({
        ruleId: 'nonexistent_symbol_ref',
        dimension: 'specificity',
        type: 'penalty',
        points: pts,
        detail: { symbols: unverifiedSymbols.map((s) => s.name).join(', '), count: String(unverifiedSymbols.length) },
      });
    }

    // Bonus: named entities matching project (exclude session-injected files)
    const entityCount = context.relevantFiles.filter(
      (f) => f.weight >= 0.5 && f.reason !== 'Referenced in prior session messages',
    ).length;
    if (entityCount > 0) {
      const pts = Math.min(entityCount * 2, 10); // Cap at 10pts to prevent inflation
      score += pts;
      bonuses.push(`Named entities matching project: ${entityCount} (+${pts}pts)`);
      firedRules.push({
        ruleId: 'named_entity',
        dimension: 'specificity',
        type: 'bonus',
        points: pts,
        detail: { count: String(entityCount) },
      });
    }

    // Bonus: structured format (numbered steps or bullets)
    if (/(?:^|\n)\s*(?:\d+[.)]\s|[-*]\s)/m.test(prompt)) {
      score += 3;
      bonuses.push('Structured format (steps/bullets) (+3pts)');
      firedRules.push({
        ruleId: 'structured_format',
        dimension: 'specificity',
        type: 'bonus',
        points: 3,
        detail: {},
      });
    }

    return {
      score: clamp(score),
      max: 25,
      label: 'Specificity',
      penalties,
      bonuses,
    };
  }

  private scoreContextCompleteness(
    prompt: string,
    _fingerprint: ProjectFingerprint,
    context: ResolvedContext,
    firedRules: FiredRule[],
    sessionContext?: SessionContext,
  ): DimensionScore {
    let score = HeuristicScorer.MIDPOINT;
    const penalties: string[] = [];
    const bonuses: string[] = [];

    // Penalty: unmentioned relevant files (capped at 3 files / 12pts)
    if (context.suggestedMentions.length > 0) {
      const cappedCount = Math.min(context.suggestedMentions.length, 3);
      const pts = cappedCount * 4;
      score -= pts;
      penalties.push(`Unmentioned relevant files: ${context.suggestedMentions.length} (-${pts}pts)`);
      firedRules.push({
        ruleId: 'unmentioned_relevant_files',
        dimension: 'context',
        type: 'penalty',
        points: pts,
        detail: { files: context.suggestedMentions.slice(0, 3).join(', '), count: String(context.suggestedMentions.length) },
      });
    }

    // Penalty: ORM present but no model/schema mentioned
    if (context.stackHints.some((h) => /\bmodel\b|\bschema\b|\bentity\b/i.test(h))) {
      const hasModelRef = /\b(model|schema|entity|table)\b/i.test(prompt);
      if (!hasModelRef) {
        score -= 3;
        penalties.push('ORM detected but no model/schema mentioned (-3pts)');
        firedRules.push({
          ruleId: 'orm_no_model',
          dimension: 'context',
          type: 'penalty',
          points: 3,
          detail: {},
        });
      }
    }

    // Penalty: "fix" without expected/actual behavior
    if (/\bfix\b/i.test(prompt)) {
      const hasExpectedActual = /\b(expected|actual|should|instead|but)\b/i.test(prompt);
      if (!hasExpectedActual) {
        const sessionDescribesBug = sessionContext?.recentMessages.some((m) =>
          /\b(error|bug|broken|fails?|crash|wrong|unexpected)\b/i.test(m.content),
        );
        if (sessionDescribesBug) {
          score -= 2;
          penalties.push('"fix" without behavior description (partially in session) (-2pts)');
          firedRules.push({
            ruleId: 'fix_without_current_behavior_session',
            dimension: 'context',
            type: 'penalty',
            points: 2,
            detail: {},
          });
        } else {
          score -= 5;
          penalties.push('"fix" without expected/actual behavior (-5pts)');
          firedRules.push({
            ruleId: 'fix_without_current_behavior',
            dimension: 'context',
            type: 'penalty',
            points: 5,
            detail: {},
          });
        }
      }
    }

    // Bonus: has error message (backticks or quotes with text)
    if (/[`"'][\w\s:./\\()-]{5,}[`"']/.test(prompt)) {
      score += 4;
      bonuses.push('Error message or quoted text (+4pts)');
      firedRules.push({
        ruleId: 'has_error_message',
        dimension: 'context',
        type: 'bonus',
        points: 4,
        detail: {},
      });
    }

    // Bonus: repro steps
    if (/\b(when i|steps to|reproduce|repro)\b/i.test(prompt)) {
      score += 3;
      bonuses.push('Reproduction steps provided (+3pts)');
      firedRules.push({
        ruleId: 'has_repro_steps',
        dimension: 'context',
        type: 'bonus',
        points: 3,
        detail: {},
      });
    }

    // Bonus: references hot files
    const hotFileRefs = context.relevantFiles.filter(
      (f) => f.reason.includes('2x boost'),
    );
    if (hotFileRefs.length > 0) {
      const pts = hotFileRefs.length * 3;
      score += pts;
      bonuses.push(`References recently modified files: ${hotFileRefs.length} (+${pts}pts)`);
      firedRules.push({
        ruleId: 'references_hot_files',
        dimension: 'context',
        type: 'bonus',
        points: pts,
        detail: { count: String(hotFileRefs.length) },
      });
    }

    // Bonus: expected vs actual
    if (/\bshould\b.{1,40}\bbut\b/i.test(prompt) || /\bexpect\b.{1,40}\b(instead|actual|got)\b/i.test(prompt)) {
      score += 5;
      bonuses.push('Expected vs actual behavior described (+5pts)');
      firedRules.push({
        ruleId: 'expected_vs_actual',
        dimension: 'context',
        type: 'bonus',
        points: 5,
        detail: {},
      });
    }

    return {
      score: clamp(score),
      max: 25,
      label: 'Context Completeness',
      penalties,
      bonuses,
    };
  }

  private scoreTaskClarity(
    prompt: string,
    _fingerprint: ProjectFingerprint,
    context: ResolvedContext,
    firedRules: FiredRule[],
    sessionContext?: SessionContext,
  ): DimensionScore {
    let score = HeuristicScorer.MIDPOINT;
    const penalties: string[] = [];
    const bonuses: string[] = [];

    // Penalty: multiple tasks
    const taskSeparators = prompt.match(/\b(and also|then also|and then|also add|also update|also fix)\b/gi);
    if (taskSeparators && taskSeparators.length > 0) {
      const pts = taskSeparators.length * 3;
      score -= pts;
      penalties.push(`Multiple tasks detected: ${taskSeparators.length} separators (-${pts}pts)`);
      firedRules.push({
        ruleId: 'multiple_tasks',
        dimension: 'clarity',
        type: 'penalty',
        points: pts,
        detail: { separators: taskSeparators.join(', '), count: String(taskSeparators.length) },
      });
    }

    // Penalty: no success criteria
    if (!/\b(should|must|expect|return|produce|output|result)\b/i.test(prompt)) {
      score -= 4;
      penalties.push('No success criteria (-4pts)');
      firedRules.push({
        ruleId: 'no_success_criteria',
        dimension: 'clarity',
        type: 'penalty',
        points: 4,
        detail: {},
      });
    }

    // Penalty: convention conflicts
    if (context.conventionConflicts.length > 0) {
      const pts = context.conventionConflicts.length * 3;
      score -= pts;
      penalties.push(`Convention conflicts: ${context.conventionConflicts.length} (-${pts}pts)`);
      firedRules.push({
        ruleId: 'convention_conflict',
        dimension: 'clarity',
        type: 'penalty',
        points: pts,
        detail: { conflicts: context.conventionConflicts.join('; '), count: String(context.conventionConflicts.length) },
      });
    }

    // Penalty: ambiguous pronouns
    const ambiguousPronouns = prompt.match(/\b(fix it|update that|change this|do that|handle it|make it)\b/gi);
    if (ambiguousPronouns) {
      if (sessionContext && sessionContext.recentSubjects.length > 0) {
        score -= 1;
        penalties.push(`Ambiguous pronouns (session context partially resolves): ${ambiguousPronouns.join(', ')} (-1pt)`);
        firedRules.push({
          ruleId: 'ambiguous_pronouns_session',
          dimension: 'clarity',
          type: 'penalty',
          points: 1,
          detail: { phrases: ambiguousPronouns.join(', ') },
        });
      } else {
        score -= 3;
        penalties.push(`Ambiguous pronouns: ${ambiguousPronouns.join(', ')} (-3pts)`);
        firedRules.push({
          ruleId: 'ambiguous_pronouns',
          dimension: 'clarity',
          type: 'penalty',
          points: 3,
          detail: { phrases: ambiguousPronouns.join(', ') },
        });
      }
    }

    // Bonus: single scoped action
    if (!taskSeparators || taskSeparators.length === 0) {
      const actionVerbs = prompt.match(/\b(add|create|fix|update|implement|refactor|remove|delete|rename|move|extract|write|build)\b/gi);
      if (actionVerbs && new Set(actionVerbs.map((v) => v.toLowerCase())).size === 1) {
        score += 4;
        bonuses.push('Single scoped action (+4pts)');
        firedRules.push({
          ruleId: 'single_scoped_action',
          dimension: 'clarity',
          type: 'bonus',
          points: 4,
          detail: {},
        });
      }
    }

    // Bonus: explicit acceptance criteria
    if (/\b(it should|should return|must return|returns? \w|expect(s|ed)?\b)/i.test(prompt)) {
      score += 5;
      bonuses.push('Explicit acceptance criteria (+5pts)');
      firedRules.push({
        ruleId: 'explicit_acceptance',
        dimension: 'clarity',
        type: 'bonus',
        points: 5,
        detail: {},
      });
    }

    // Bonus: references AI instructions
    if (/\bCLAUDE\.md\b|\.cursorrules\b|\.aiderignore\b|ai.?instructions?\b/i.test(prompt)) {
      score += 3;
      bonuses.push('References AI instructions (+3pts)');
      firedRules.push({
        ruleId: 'references_ai_instructions',
        dimension: 'clarity',
        type: 'bonus',
        points: 3,
        detail: {},
      });
    }

    // Bonus: named subject (specific function/class/component names)
    const namedSubjects = prompt.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g)?.filter((m) => !PASCAL_CASE_BLOCKLIST.has(m));
    if (namedSubjects && namedSubjects.length > 0) {
      score += 3;
      bonuses.push(`Named subjects: ${namedSubjects.join(', ')} (+3pts)`);
      firedRules.push({
        ruleId: 'named_subject',
        dimension: 'clarity',
        type: 'bonus',
        points: 3,
        detail: { names: namedSubjects.join(', ') },
      });
    }

    return {
      score: clamp(score),
      max: 25,
      label: 'Task Clarity',
      penalties,
      bonuses,
    };
  }

  private scoreAnchoring(
    prompt: string,
    fingerprint: ProjectFingerprint,
    context: ResolvedContext,
    firedRules: FiredRule[],
    sessionContext?: SessionContext,
  ): DimensionScore {
    let score = HeuristicScorer.MIDPOINT;
    const penalties: string[] = [];
    const bonuses: string[] = [];

    // Extract @mentions and bare paths from prompt
    const atMentions = [...prompt.matchAll(/@([\w./-]+)/g)].map((m) => m[1]);
    const barePaths = [...prompt.matchAll(/(?<!\w)([\w-]+(?:\/[\w.-]+){1,})/g)].map((m) => m[1]);
    const allPathRefs = [...new Set([...atMentions, ...barePaths])];

    // Penalty: no file paths at all
    if (allPathRefs.length === 0) {
      if (sessionContext && sessionContext.recentFiles.length > 0) {
        // Session establishes file context — no penalty
        bonuses.push(`File context from session (${sessionContext.recentFiles.length} files)`);
        firedRules.push({
          ruleId: 'no_file_paths_session',
          dimension: 'anchoring',
          type: 'bonus',
          points: 0,
          detail: { sessionFiles: String(sessionContext.recentFiles.length) },
        });
      } else {
        score -= 5;
        penalties.push('No file paths or @mentions (-5pts)');
        firedRules.push({
          ruleId: 'no_file_paths',
          dimension: 'anchoring',
          type: 'penalty',
          points: 5,
          detail: {},
        });
      }
    }

    // Build set of all file paths in project for validation
    const projectPaths = new Set<string>();
    function collectPaths(nodes: typeof fingerprint.fileTree) {
      for (const node of nodes) {
        projectPaths.add(node.path);
        if (node.children) collectPaths(node.children);
      }
    }
    collectPaths(fingerprint.fileTree);

    // Check each path ref
    let validCount = 0;
    let hotRefCount = 0;
    const hotSet = new Set(fingerprint.hotFiles);

    for (const ref of allPathRefs) {
      if (projectPaths.has(ref)) {
        validCount++;
        if (hotSet.has(ref)) {
          hotRefCount++;
        }
      } else {
        // Check if it's a partial match (suffix matching)
        const isPartial = [...projectPaths].some((p) => p.endsWith(ref) || p.includes(ref));
        if (isPartial) {
          validCount++;
        } else {
          score -= 3;
          penalties.push(`Nonexistent file ref: ${ref} (-3pts)`);
          firedRules.push({
            ruleId: 'nonexistent_file_ref',
            dimension: 'anchoring',
            type: 'penalty',
            points: 3,
            detail: { path: ref },
          });
        }
      }
    }

    // Penalty: entity found in tree but no path given
    // Skip files that came from session context (they were referenced in prior messages)
    if (allPathRefs.length === 0 && context.relevantFiles.length > 0) {
      const unmatchedEntities = context.relevantFiles.filter(
        (f) => f.weight >= 0.5 && f.reason !== 'Referenced in prior session messages',
      );
      if (unmatchedEntities.length > 0) {
        const pts = unmatchedEntities.length * 4;
        score -= pts;
        penalties.push(`Entities found in project but not path-referenced: ${unmatchedEntities.length} (-${pts}pts)`);
        firedRules.push({
          ruleId: 'entity_not_pathed',
          dimension: 'anchoring',
          type: 'penalty',
          points: pts,
          detail: { count: String(unmatchedEntities.length) },
        });
      }
    }

    // Bonus: accurate file references
    if (validCount > 0) {
      const pts = Math.min(5 + (validCount - 1) * 3, 5 + 3 * 3); // max 3 additional
      score += pts;
      bonuses.push(`Accurate file references: ${validCount} (+${pts}pts)`);
      firedRules.push({
        ruleId: 'accurate_file_ref',
        dimension: 'anchoring',
        type: 'bonus',
        points: pts,
        detail: { count: String(validCount) },
      });
    }

    // Bonus: hot file references
    if (hotRefCount > 0) {
      score += 4;
      bonuses.push(`References recently modified file (+4pts)`);
      firedRules.push({
        ruleId: 'hot_file_ref',
        dimension: 'anchoring',
        type: 'bonus',
        points: 4,
        detail: { count: String(hotRefCount) },
      });
    }

    // Penalty: symbol referenced in a different file than @mentioned (Tier 2D)
    if (allPathRefs.length > 0 && context.symbolReferences.length > 0) {
      for (const symRef of context.symbolReferences) {
        if (!symRef.verified || !symRef.filePath) continue;
        // Check if any @mentioned path contains a different file than where the symbol lives
        const symbolInMentioned = allPathRefs.some(
          (ref) => symRef.filePath!.endsWith(ref) || symRef.filePath!.includes(ref),
        );
        if (!symbolInMentioned) {
          // Check if the prompt mentions the symbol near a wrong file ref
          const mentionsSymbol = new RegExp(`\\b${symRef.name}\\b`).test(prompt);
          if (mentionsSymbol) {
            score -= 3;
            penalties.push(`Symbol "${symRef.name}" lives in ${symRef.filePath} but referenced file differs (-3pts)`);
            firedRules.push({
              ruleId: 'symbol_file_mismatch',
              dimension: 'anchoring',
              type: 'penalty',
              points: 3,
              detail: { symbol: symRef.name, actualFile: symRef.filePath },
            });
            break; // Only fire once
          }
        }
      }
    }

    return {
      score: clamp(score),
      max: 25,
      label: 'File & Folder Anchoring',
      penalties,
      bonuses,
    };
  }

  private toGrade(total: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (total >= 90) return 'A';
    if (total >= 70) return 'B';
    if (total >= 50) return 'C';
    if (total >= 30) return 'D';
    return 'F';
  }
}

function clamp(score: number): number {
  return Math.max(0, Math.min(25, score));
}

/** PascalCase tech/brand names that should not count as project-specific identifiers */
const PASCAL_CASE_BLOCKLIST = new Set([
  // Languages & runtimes
  'TypeScript', 'JavaScript', 'CoffeeScript', 'ActionScript', 'AppleScript',
  'NodeJs', 'DenoJs',
  // Frameworks & libraries
  'ReactJs', 'VueJs', 'NextJs', 'NuxtJs', 'AngularJs', 'EmberJs', 'SvelteKit',
  'ExpressJs', 'TailwindCss', 'PostCss',
  'ElasticSearch', 'OpenSearch', 'TensorFlow',
  // Platforms & services
  'GitHub', 'GitLab', 'BitBucket',
  'YouTube', 'WordPress', 'LinkedIn', 'StackOverflow', 'PayPal',
  'CloudFlare', 'DigitalOcean',
  // Web technologies
  'WebSocket', 'WebAssembly', 'WebPack', 'WebView',
  // Tools & misc
  'DevOps', 'DevTools', 'DockerHub', 'PowerShell',
  'LangChain', 'ChatGpt', 'OpenAi',
  // Generic compound words
  'BackEnd', 'FrontEnd', 'FullStack',
]);

function hasPascalCaseIdentifier(text: string): boolean {
  const matches = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g);
  if (!matches) return false;
  return matches.some((m) => !PASCAL_CASE_BLOCKLIST.has(m));
}

function stripQuotedContent(text: string): string {
  let result = text.replace(/```[\s\S]*?```/g, '');
  result = result.replace(/`[^`]+`/g, '');
  result = result.replace(/"[^"]+"/g, '');
  result = result.replace(/'[^']+'/g, '');
  return result;
}
