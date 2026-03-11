import type { ProjectFingerprint, FileNode, TechStack, FileSymbols } from '../indexer/types.js';
import type { SessionContext } from '../session/types.js';
import type { ResolvedContext, SymbolReference } from './types.js';

// ── Types ──────────────────────────────────────────────────────────────

interface FlatFile {
  path: string;
  name: string;
  nameStem: string;
  segments: string[];
  type: 'file' | 'directory';
}

// ── Synonym map ───────────────────────────────────────────────────────

const SYNONYM_MAP = new Map<string, string[]>([
  ['auth', ['authentication', 'authorization']],
  ['authentication', ['auth']],
  ['authorization', ['auth']],
  ['db', ['database']],
  ['database', ['db']],
  ['config', ['configuration']],
  ['configuration', ['config']],
  ['util', ['utils', 'helpers', 'helper']],
  ['utils', ['util', 'helpers', 'helper']],
  ['helpers', ['util', 'utils', 'helper']],
  ['helper', ['util', 'utils', 'helpers']],
  ['err', ['error', 'errors']],
  ['error', ['err', 'errors']],
  ['errors', ['err', 'error']],
  ['msg', ['message', 'messages']],
  ['message', ['msg', 'messages']],
  ['messages', ['msg', 'message']],
  ['btn', ['button']],
  ['button', ['btn']],
  ['nav', ['navigation']],
  ['navigation', ['nav']],
  ['repo', ['repository']],
  ['repository', ['repo']],
  ['env', ['environment']],
  ['environment', ['env']],
  ['middleware', ['mw']],
  ['mw', ['middleware']],
  ['param', ['parameter', 'params']],
  ['params', ['parameter', 'param']],
  ['parameter', ['param', 'params']],
  ['val', ['validation', 'validate']],
  ['validation', ['val', 'validate']],
  ['validate', ['val', 'validation']],
]);

// ── camelCase / PascalCase splitting ──────────────────────────────────

function splitCamelCase(token: string): string[] {
  // Split on camelCase / PascalCase boundaries
  // e.g. "getUserById" → ["get", "User", "By", "Id"] → lowered & filtered
  const parts = token
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/\s+/)
    .map((p) => p.toLowerCase())
    .filter((p) => p.length > 1);

  return parts;
}

// ── Stop words ─────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'can', 'may', 'might', 'shall', 'must', 'to', 'of', 'in',
  'for', 'on', 'at', 'by', 'with', 'from', 'as', 'into', 'through',
  'about', 'between', 'that', 'this', 'these', 'those', 'it', 'its',
  'they', 'them', 'their', 'we', 'our', 'you', 'your', 'he', 'she',
  'his', 'her', 'my', 'me', 'i', 'what', 'which', 'who', 'how',
  'when', 'where', 'if', 'then', 'but', 'or', 'and', 'not', 'no',
  'so', 'up', 'out', 'all', 'each', 'every', 'both', 'few', 'more',
  'some', 'any', 'other', 'than', 'too', 'very', 'just', 'also',
  // Prompt-specific action words (carry intent, not project-specificity)
  'please', 'make', 'sure', 'want', 'need', 'add', 'create', 'fix',
  'update', 'change', 'implement', 'use', 'using', 'write', 'like',
  'get', 'set', 'new', 'let', 'try', 'something', 'thing', 'way',
  'work', 'works', 'working', 'help', 'handle', 'improve', 'do',
]);

// ── Stack hint rules ───────────────────────────────────────────────────

interface StackHintRule {
  promptPattern: RegExp;
  stackField: keyof TechStack;
  stackValue: string;
  techName: string;
  hint: string;
}

const STACK_HINT_RULES: StackHintRule[] = [
  // ORM hints
  { promptPattern: /\b(database|schema|model|migration|table|query|record)\b/i, stackField: 'orm', stackValue: 'prisma', techName: 'prisma', hint: 'Project uses Prisma — reference the model name from schema.prisma' },
  { promptPattern: /\b(database|schema|model|migration|table|query)\b/i, stackField: 'orm', stackValue: 'drizzle', techName: 'drizzle', hint: 'Project uses Drizzle ORM — reference the schema definition file' },
  { promptPattern: /\b(database|schema|model|migration|table|query)\b/i, stackField: 'orm', stackValue: 'typeorm', techName: 'typeorm', hint: 'Project uses TypeORM — reference the entity class' },
  { promptPattern: /\b(database|schema|model|query|collection)\b/i, stackField: 'orm', stackValue: 'mongoose', techName: 'mongoose', hint: 'Project uses Mongoose — reference the schema/model file' },
  { promptPattern: /\b(database|schema|model|migration)\b/i, stackField: 'orm', stackValue: 'sqlalchemy', techName: 'sqlalchemy', hint: 'Project uses SQLAlchemy — reference the model class' },
  // Test runner hints
  { promptPattern: /\b(tests?|spec|coverage|assert|describe)\b/i, stackField: 'testRunner', stackValue: 'vitest', techName: 'vitest', hint: 'Project uses Vitest — name the test file or describe pattern' },
  { promptPattern: /\b(tests?|spec|coverage|assert|describe)\b/i, stackField: 'testRunner', stackValue: 'jest', techName: 'jest', hint: 'Project uses Jest — name the test file or describe pattern' },
  { promptPattern: /\b(tests?|spec|coverage|assert)\b/i, stackField: 'testRunner', stackValue: 'pytest', techName: 'pytest', hint: 'Project uses Pytest — name the test file or function' },
  // Styling hints
  { promptPattern: /\b(style|css|class|design|layout|ui)\b/i, stackField: 'styling', stackValue: 'tailwind', techName: 'tailwind', hint: 'Project uses Tailwind CSS — use utility class names' },
  { promptPattern: /\b(style|css|class)\b/i, stackField: 'styling', stackValue: 'styled-components', techName: 'styled-components', hint: 'Project uses styled-components — reference the styled component' },
  // UI library hints
  { promptPattern: /\b(component|page|render|hook|state|prop|jsx|tsx)\b/i, stackField: 'uiLibrary', stackValue: 'react', techName: 'react', hint: 'Project uses React — name the component and its props' },
  { promptPattern: /\b(component|page|render|directive)\b/i, stackField: 'uiLibrary', stackValue: 'vue', techName: 'vue', hint: 'Project uses Vue — name the component and relevant options' },
  { promptPattern: /\b(component|page|render)\b/i, stackField: 'uiLibrary', stackValue: 'svelte', techName: 'svelte', hint: 'Project uses Svelte — name the component file' },
  // Framework hints
  { promptPattern: /\b(route|endpoint|api|handler|middleware|page)\b/i, stackField: 'framework', stackValue: 'nextjs', techName: 'next', hint: 'Project uses Next.js — specify App Router or Pages Router path' },
  { promptPattern: /\b(route|endpoint|api|handler|middleware)\b/i, stackField: 'framework', stackValue: 'express', techName: 'express', hint: 'Project uses Express — name the route file and HTTP method' },
  { promptPattern: /\b(route|endpoint|api|handler)\b/i, stackField: 'framework', stackValue: 'fastapi', techName: 'fastapi', hint: 'Project uses FastAPI — name the router and endpoint' },
  { promptPattern: /\b(route|endpoint|api|view|url)\b/i, stackField: 'framework', stackValue: 'django', techName: 'django', hint: 'Project uses Django — name the view and URL pattern' },
  // Language hints
  { promptPattern: /\b(type|interface|generic|enum)\b/i, stackField: 'language', stackValue: 'typescript', techName: 'typescript', hint: 'Project uses TypeScript — include the type/interface name' },
];

// ── Helper functions ───────────────────────────────────────────────────

function isSubstringMatch(keyword: string, nameStem: string): boolean {
  if (keyword.length < 3) return false;
  if (!nameStem.includes(keyword) && !keyword.includes(nameStem)) return false;
  const shorter = Math.min(keyword.length, nameStem.length);
  const longer = Math.max(keyword.length, nameStem.length);
  return shorter / longer >= 0.6;
}

function extractKeywords(prompt: string): string[] {
  const keywords = new Set<string>();

  // Extract segments from @mentions (use original case for camelCase splitting)
  const mentionMatches = prompt.matchAll(/@([\w./-]+)/g);
  for (const match of mentionMatches) {
    const segments = match[1].split('/');
    for (const seg of segments) {
      const stem = seg.replace(/\.\w+$/, '');
      if (stem.length > 1) {
        const lower = stem.toLowerCase();
        if (!STOP_WORDS.has(lower)) {
          keywords.add(lower);
        }
        // Split camelCase/PascalCase parts
        for (const part of splitCamelCase(stem)) {
          if (!STOP_WORDS.has(part)) {
            keywords.add(part);
          }
        }
      }
    }
  }

  // Extract PascalCase/camelCase identifiers from prompt before lowering
  const identifiers = prompt.matchAll(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)+|[a-z]+(?:[A-Z][a-z]+)+)\b/g);
  for (const match of identifiers) {
    const lower = match[1].toLowerCase();
    if (!STOP_WORDS.has(lower)) {
      keywords.add(lower);
    }
    for (const part of splitCamelCase(match[1])) {
      if (!STOP_WORDS.has(part)) {
        keywords.add(part);
      }
    }
  }

  // Extract regular words
  const lower = prompt.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9/_.\-\s]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);

  for (const token of tokens) {
    if (token.startsWith('@')) continue;

    if (token.includes('/')) {
      for (const seg of token.split('/')) {
        const stem = seg.replace(/\.\w+$/, '');
        if (stem.length > 1 && !STOP_WORDS.has(stem)) {
          keywords.add(stem);
        }
      }
    } else {
      const stem = token.replace(/\.\w+$/, '');
      if (stem.length > 1 && !STOP_WORDS.has(stem)) {
        keywords.add(stem);
      }
    }
  }

  return [...keywords];
}

function flattenFileTree(fileTree: FileNode[]): FlatFile[] {
  const result: FlatFile[] = [];

  function walk(nodes: FileNode[]) {
    for (const node of nodes) {
      const segments = node.path.split('/');
      const nameStem = node.name.replace(/\.\w+$/, '');
      result.push({
        path: node.path,
        name: node.name,
        nameStem: nameStem.toLowerCase(),
        segments: segments.map((s) => s.toLowerCase()),
        type: node.type,
      });
      if (node.children) {
        walk(node.children);
      }
    }
  }

  walk(fileTree);
  return result;
}

function scoreFileRelevance(
  keywords: string[],
  flatFiles: FlatFile[],
  hotFiles: string[],
  activeFile?: string,
): ResolvedContext['relevantFiles'] {
  const hotSet = new Set(hotFiles);

  const scored: { path: string; score: number; reasons: string[] }[] = [];

  for (const file of flatFiles) {
    if (file.type === 'directory') continue;

    let score = 0;
    const reasons: string[] = [];

    // Active file gets maximum relevance
    if (activeFile && file.path === activeFile) {
      scored.push({ path: file.path, score: Infinity, reasons: ['Currently active file'] });
      continue;
    }

    // Keyword matching (direct)
    for (const keyword of keywords) {
      if (file.nameStem === keyword) {
        score += 3;
        reasons.push(`Name matches "${keyword}"`);
      } else if (isSubstringMatch(keyword, file.nameStem)) {
        score += 2;
        reasons.push(`Name contains "${keyword}"`);
      } else if (file.segments.some((seg) => isSubstringMatch(keyword, seg.replace(/(?:\.(?:test|spec))?\.[\w]+$/, '')))) {
        score += 1;
        reasons.push(`Path contains "${keyword}"`);
      } else {
        // Synonym matching (lower score than direct)
        const synonyms = SYNONYM_MAP.get(keyword);
        if (synonyms) {
          for (const syn of synonyms) {
            if (file.nameStem === syn) {
              score += 2;
              reasons.push(`Name matches synonym "${syn}" of "${keyword}"`);
              break;
            }
          }
        }
      }
    }

    // Recency boost
    if (score > 0 && hotSet.has(file.path)) {
      score *= 2;
      reasons.push('Recently modified (2x boost)');
    }

    if (score > 0) {
      scored.push({ path: file.path, score, reasons });
    }
  }

  // Sort by score descending, take top 10
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 10);

  if (top.length === 0) return [];

  // Normalize weights: max score = 1.0
  const maxScore = top[0].score === Infinity ? 1 : top[0].score;

  return top.map((item) => ({
    path: item.path,
    reason: item.reasons.join('; '),
    weight: item.score === Infinity ? 1.0 : Math.max(0.1, item.score / maxScore),
  }));
}

function findUnmentionedReferences(
  prompt: string,
  relevantFiles: ResolvedContext['relevantFiles'],
): string[] {
  // Extract all @mentioned paths
  const mentioned = new Set<string>();
  const mentionMatches = prompt.matchAll(/@([\w./-]+)/g);
  for (const match of mentionMatches) {
    mentioned.add(match[1]);
  }

  // Also detect bare path-like strings (e.g. src/middleware/auth.ts without @)
  const barePathMatches = prompt.matchAll(/(?<!\w)([\w-]+(?:\/[\w.-]+){1,})/g);
  for (const match of barePathMatches) {
    mentioned.add(match[1]);
  }

  // Return relevant files with weight >= 0.5 that aren't mentioned
  return relevantFiles
    .filter((f) => f.weight >= 0.5 && !mentioned.has(f.path))
    .map((f) => f.path);
}

function buildStackHints(prompt: string, stack: TechStack): string[] {
  const lower = prompt.toLowerCase();
  const hints: string[] = [];
  const seen = new Set<string>();

  for (const rule of STACK_HINT_RULES) {
    const stackVal = stack[rule.stackField];
    if (stackVal !== rule.stackValue) continue;
    if (!rule.promptPattern.test(prompt)) continue;

    // Skip if the user already mentions the technology
    if (lower.includes(rule.techName.toLowerCase())) continue;

    // Deduplicate by hint text
    if (seen.has(rule.hint)) continue;
    seen.add(rule.hint);

    hints.push(rule.hint);
  }

  return hints;
}

function checkConventionConflicts(
  prompt: string,
  aiInstructions: string,
): string[] {
  if (!aiInstructions) return [];

  const conflicts: string[] = [];
  const lower = prompt.toLowerCase();
  const lines = aiInstructions.toLowerCase().split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // "use X" rules — detect competing tools
    const useMatch = trimmed.match(/\buse\s+([\w.-]+)/);
    if (useMatch) {
      const preferred = useMatch[1];
      const competitors = getCompetitors(preferred);
      for (const comp of competitors) {
        if (lower.includes(comp) && !lower.includes(preferred)) {
          conflicts.push(`Prompt mentions "${comp}" but project conventions specify "use ${preferred}"`);
        }
      }
    }

    // "avoid X" / "don't use X" / "never X" rules
    const avoidMatch = trimmed.match(/\b(?:avoid|don'?t use|never use|never)\s+([\w.-]+)/);
    if (avoidMatch) {
      const forbidden = avoidMatch[1];
      if (lower.includes(forbidden)) {
        conflicts.push(`Prompt mentions "${forbidden}" but project conventions say to avoid it`);
      }
    }

    // "prefer X" / "always use X" rules
    const preferMatch = trimmed.match(/\b(?:prefer|always use)\s+(named\s+export|default\s+export|async\/await|\.then|callbacks?)/);
    if (preferMatch) {
      const preferred = preferMatch[1];
      if (preferred.includes('named export') && lower.includes('default export')) {
        conflicts.push('Prompt asks for default export but project conventions prefer named exports');
      }
      if (preferred.includes('async/await') && (lower.includes('.then(') || lower.includes('callback'))) {
        conflicts.push('Prompt suggests .then()/callbacks but project conventions prefer async/await');
      }
    }
  }

  return [...new Set(conflicts)];
}

function getCompetitors(tool: string): string[] {
  const groups: string[][] = [
    ['vitest', 'jest', 'mocha', 'ava'],
    ['pnpm', 'npm', 'yarn'],
    ['prisma', 'drizzle', 'typeorm', 'sequelize', 'mongoose'],
    ['tailwind', 'styled-components', 'css modules', 'sass'],
    ['react', 'vue', 'svelte', 'angular'],
  ];

  for (const group of groups) {
    if (group.includes(tool)) {
      return group.filter((t) => t !== tool);
    }
  }
  return [];
}

function detectMissingConstraints(prompt: string, stack: TechStack): string[] {
  const constraints: string[] = [];
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);

  // Only check for longer prompts (short prompts are already penalized for being vague)
  if (words.length < 10) return constraints;

  // No output format specified
  const formatIndicators = [
    'json', 'typescript', 'javascript', 'html', 'css', 'markdown',
    'function', 'class', 'component', 'test', 'file', 'type', 'interface',
    'return', 'endpoint', 'api', 'hook', 'module',
  ];
  if (!formatIndicators.some((f) => lower.includes(f))) {
    constraints.push('Consider specifying the expected output format');
  }

  // Error scenarios mentioned without handling specification
  const errorTerms = ['error', 'fail', 'invalid', 'wrong', 'break', 'crash', 'edge case', 'null', 'undefined', 'exception'];
  const handlingTerms = ['should return', 'should throw', 'should show', 'should display', 'should log', 'should handle', 'gracefully', 'fallback'];
  const hasErrorTerms = errorTerms.some((t) => lower.includes(t));
  const hasHandling = handlingTerms.some((t) => lower.includes(t));
  if (hasErrorTerms && !hasHandling) {
    constraints.push('Describe expected error handling behavior');
  }

  // TypeScript project requesting code without type mentions
  if (stack.language === 'typescript') {
    const codeVerbs = ['create', 'write', 'add', 'implement', 'build'];
    const typeTerms = ['type', 'interface', 'generic', 'typed', 'types'];
    const requestsCode = codeVerbs.some((v) => lower.includes(v));
    const mentionsTypes = typeTerms.some((t) => lower.includes(t));
    if (requestsCode && !mentionsTypes) {
      constraints.push('Consider specifying TypeScript types for inputs and outputs');
    }
  }

  return constraints;
}

// ── Symbol resolution ─────────────────────────────────────────────────

function resolveSymbolReferences(
  prompt: string,
  symbolIndex?: FileSymbols[],
): SymbolReference[] {
  if (!symbolIndex) return [];

  const refs: SymbolReference[] = [];
  const seen = new Set<string>();

  // Extract PascalCase identifiers (class/type names) and camelCase (function names)
  const identifierPattern = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+|[a-z]+(?:[A-Z][a-z]+)+)\b/g;
  const matches = prompt.matchAll(identifierPattern);

  for (const match of matches) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);

    // Look up in symbol index
    let found = false;
    for (const fileSymbols of symbolIndex) {
      const symbolMatch = fileSymbols.symbols.find(
        (s) => s.name === name,
      );
      if (symbolMatch) {
        refs.push({ name, filePath: fileSymbols.filePath, verified: true });
        found = true;
        break;
      }
    }

    if (!found) {
      refs.push({ name, filePath: null, verified: false });
    }
  }

  return refs;
}

/** Resolve session subjects against the symbol index, skipping already-resolved names */
function resolveSessionSymbols(
  subjects: string[],
  symbolIndex: FileSymbols[] | undefined,
  existing: SymbolReference[],
): SymbolReference[] {
  if (!symbolIndex || subjects.length === 0) return [];

  const alreadyResolved = new Set(existing.map((r) => r.name));
  const refs: SymbolReference[] = [];

  for (const name of subjects) {
    if (alreadyResolved.has(name)) continue;

    for (const fileSymbols of symbolIndex) {
      const match = fileSymbols.symbols.find((s) => s.name === name);
      if (match) {
        refs.push({ name, filePath: fileSymbols.filePath, verified: true });
        break;
      }
    }
  }

  return refs;
}

// ── Main function ──────────────────────────────────────────────────────

/**
 * Maps a raw prompt to the relevant slice of the ProjectFingerprint.
 * This is what makes PrompyAI's suggestions specific rather than generic.
 *
 * Three relevance mechanisms:
 * 1. Keyword extraction — match prompt nouns against file/folder/dependency names
 * 2. Recency boost — hotFiles get 2x relevance weight
 * 3. Active context — currently open file gets maximum weight (future hook)
 */
export function resolveContext(
  prompt: string,
  fingerprint: ProjectFingerprint,
  activeFile?: string,
  sessionContext?: SessionContext,
): ResolvedContext {
  const keywords = extractKeywords(prompt);
  const flatFiles = flattenFileTree(fingerprint.fileTree);
  const relevantFiles = scoreFileRelevance(keywords, flatFiles, fingerprint.hotFiles, activeFile);

  // Inject session file references as relevant files
  if (sessionContext) {
    injectSessionFiles(sessionContext.recentFiles, relevantFiles, flatFiles);
  }

  const suggestedMentions = findUnmentionedReferences(prompt, relevantFiles);

  // Filter out files already referenced in the session
  const filteredMentions = sessionContext
    ? suggestedMentions.filter((path) => !sessionContext.recentFiles.some(
        (sf) => path.endsWith(sf) || path.includes(sf),
      ))
    : suggestedMentions;

  const stackHints = buildStackHints(prompt, fingerprint.stack);
  const conventionConflicts = checkConventionConflicts(prompt, fingerprint.aiInstructions);
  const missingConstraints = detectMissingConstraints(prompt, fingerprint.stack);
  const symbolReferences = resolveSymbolReferences(prompt, fingerprint.symbolIndex);

  // Also resolve session subjects against the symbol index
  if (sessionContext) {
    const sessionSymbols = resolveSessionSymbols(sessionContext.recentSubjects, fingerprint.symbolIndex, symbolReferences);
    symbolReferences.push(...sessionSymbols);
  }

  return {
    relevantFiles,
    suggestedMentions: filteredMentions,
    stackHints,
    conventionConflicts,
    missingConstraints,
    symbolReferences,
    sessionFiles: sessionContext?.recentFiles,
    hasSessionContext: sessionContext != null,
  };
}

function injectSessionFiles(
  sessionFiles: string[],
  relevantFiles: ResolvedContext['relevantFiles'],
  flatFiles: FlatFile[],
): void {
  const existingPaths = new Set(relevantFiles.map((f) => f.path));

  for (const ref of sessionFiles) {
    // Find matching project file (exact or suffix match)
    const match = flatFiles.find(
      (f) => f.type === 'file' && (f.path === ref || f.path.endsWith(ref) || f.path.includes(ref)),
    );

    if (match && !existingPaths.has(match.path)) {
      relevantFiles.push({
        path: match.path,
        reason: 'Referenced in prior session messages',
        weight: 0.6,
      });
      existingPaths.add(match.path);
    }
  }
}
