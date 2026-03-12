# PrompyAI — Architecture

## What It Is

Context-aware prompt intelligence MCP server for Claude CLI. Scores developer prompts against their real codebase, generates AI-powered suggestions, and rewrites enhanced prompts. Session-aware, multi-agent aware, with built-in telemetry and rate limiting.

## High-Level Flow

```
Developer prompt
       │
       ▼
┌─────────────────────┐
│  MCP Server (stdio) │  ← Claude CLI connects via JSON-RPC
│  server.ts          │     Telemetry + rate limiting wired here
└──────┬──────────────┘
       │
       ├── SessionParser.autoDetect(workspace_path)
       │   Reads ~/.claude/projects/<encoded>/  JSONL transcripts
       │   Includes subagent files for multi-agent awareness
       │
       ▼
┌─────────────────────┐
│  WorkspaceIndexer   │  ← Builds ProjectFingerprint (cached 1min)
│  indexer/           │     Stack detection (monorepo-aware),
│                     │     file tree, hot files, AI instructions,
│                     │     symbol index, convention hints
└──────┬──────────────┘
       │ ProjectFingerprint
       ▼
┌─────────────────────┐
│  ScoringEngine      │  ← Orchestrates the 4-step pipeline
│  scorer/            │
└──────┬──────────────┘
       │
       ├── 1. ContextResolver.resolveContext()
       │      Maps prompt keywords → relevant files, stack hints,
       │      convention conflicts, suggested @mentions
       │      Injects session files + resolves session symbols
       │
       ├── 2. HeuristicScorer.score()
       │      20+ deterministic rules → numeric scores + FiredRule[]
       │      4 dimensions × 0-25 points (midpoint 15)
       │      Session-aware penalty adjustments
       │
       ├── 3. AISuggestionGenerator.generate()
       │      Claude Haiku → natural language suggestions + enhanced prompt
       │      Falls back to smart templates if no API key / timeout / rate limited
       │
       └── 4. Assemble ScoreResult
              { total, grade, dimensions, suggestions, enhancedPrompt, display }
```

## Monorepo Structure

```
PrompyAI/
├── packages/
│   ├── mcp-server/          ← Core product (npm: prompyai-mcp)
│   │   ├── src/
│   │   │   ├── mcp/         ← MCP server + tool definitions
│   │   │   │   ├── server.ts         (stdio MCP server, telemetry, rate limiting)
│   │   │   │   ├── types.ts          (Zod input schemas)
│   │   │   │   └── tools/
│   │   │   │       ├── evaluate.ts   (evaluate_prompt tool)
│   │   │   │       ├── getContext.ts  (get_context tool)
│   │   │   │       └── toggle.ts     (prompyai_toggle tool)
│   │   │   ├── indexer/     ← Workspace analysis
│   │   │   │   ├── WorkspaceIndexer.ts (orchestrator + caching)
│   │   │   │   ├── StackDetector.ts    (tech stack detection, monorepo-aware)
│   │   │   │   ├── FileCollector.ts    (file tree builder)
│   │   │   │   ├── SymbolExtractor.ts  (code symbol extraction)
│   │   │   │   └── types.ts           (ProjectFingerprint, TechStack, FileNode)
│   │   │   ├── scorer/      ← Prompt scoring pipeline
│   │   │   │   ├── ScoringEngine.ts        (pipeline orchestrator)
│   │   │   │   ├── ContextResolver.ts      (prompt → project mapping)
│   │   │   │   ├── HeuristicScorer.ts      (rule-based scoring, session-aware)
│   │   │   │   ├── AISuggestionGenerator.ts (AI suggestions + smart fallback)
│   │   │   │   ├── DisplayFormatter.ts     (pre-formatted display output)
│   │   │   │   └── types.ts               (ScoreResult, FiredRule, etc.)
│   │   │   ├── session/     ← Session context parsing
│   │   │   │   ├── SessionParser.ts  (JSONL parser, auto-detect, subagent reader)
│   │   │   │   └── types.ts          (SessionMessage, SessionContext)
│   │   │   ├── config/      ← Configuration
│   │   │   │   ├── types.ts    (PrompyAIConfig with rate limit + telemetry)
│   │   │   │   └── defaults.ts
│   │   │   ├── cli/         ← CLI commands
│   │   │   │   └── doctor.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts       (stderr-only logging)
│   │   │   │   ├── cache.ts        (generic TTL cache)
│   │   │   │   ├── fileUtils.ts    (safe file reading)
│   │   │   │   ├── machineId.ts    (anonymous hashed machine ID)
│   │   │   │   ├── telemetry.ts    (fire-and-forget batched telemetry)
│   │   │   │   └── rateLimiter.ts  (per-machine daily + global monthly caps)
│   │   │   ├── cli.ts       (CLI entry: serve | doctor)
│   │   │   └── index.ts     (public API exports)
│   │   └── tests/           (vitest, 220 tests, mirrors src/ structure)
│   ├── landing/             ← Future: prompyai.com
│   └── shared/              ← Future: shared types for IDE extensions
├── CLAUDE.md                ← AI instruction file (workflow rules)
├── ARCHITECTURE.md          ← This file
└── tasks/
    ├── todo.md
    └── lessons.md
```

## Scoring Dimensions

Each dimension scores 0-25 (starting at midpoint 15), total 0-100.

| Dimension | What It Measures | Key Rules |
|-----------|-----------------|-----------|
| **Specificity** | Concrete vs vague information | vague_verb (-3ea), short_prompt (-6), output_format (+3), named_entity (+2ea, cap 10), verified_symbol (+3ea) |
| **Context Completeness** | Does the AI have what it needs? | unmentioned_files (-4ea), fix_without_behavior (-5, -2 with session), error_message (+4), expected_vs_actual (+5) |
| **Task Clarity** | Unambiguous, well-scoped goal | multiple_tasks (-3ea), no_success_criteria (-4), ambiguous_pronouns (-3, -1 with session), single_action (+4) |
| **Anchoring** | Grounded in project structure | no_file_paths (-5, waived with session), nonexistent_ref (-3), accurate_ref (+5/+3ea), hot_file_ref (+4) |

**Grade scale:** A (>=90), B (>=70), C (>=50), D (>=30), F (<30)

## Session Context

PrompyAI reads Claude Code's JSONL session transcripts for multi-turn awareness:

```
~/.claude/projects/<encoded-workspace-path>/
├── <sessionId>.jsonl          ← Parent session messages
└── <sessionId>/
    └── subagents/
        └── agent-*.jsonl      ← Subagent research results
```

**Auto-detection:** Given `workspace_path`, derives the project directory by encoding the path (`/Users/foo/bar` → `-Users-foo-bar`), finds the newest `.jsonl` by modification time.

**What it extracts:**
- Recent user + assistant messages (last 10, within 30min)
- File references (@mentions, bare paths)
- Symbol references (PascalCase/camelCase identifiers)
- Subagent context (marked with `isSidechain: true`)

**How it affects scoring:**
- Ambiguous pronouns penalty reduced (-3 → -1) when session has recent subjects
- Missing file paths penalty waived when session establishes file context
- "fix without behavior" penalty reduced (-5 → -2) when session describes a bug
- Session files injected into relevantFiles for anchoring credit

## Rate Limiting & Telemetry

### Rate Limiter (in-memory)
- **Per-machine:** 100 LLM calls/day (resets midnight UTC)
- **Global:** ~178,000 calls/month (~$500 cost cap)
- **When exceeded:** Falls back to heuristic-only scoring (no AI suggestions)

### Telemetry (anonymous)
- **Endpoint:** Configurable via `PROMPYAI_TELEMETRY_URL`
- **Opt-out:** `PROMPYAI_TELEMETRY=false`
- **Events:** `server_start`, `tool_call`, `evaluate_prompt`, `toggle`, `tool_error`
- **Data:** Hashed machine ID + event name + timestamp only (no prompts, no code, no PII)
- **Batched:** Buffered and sent every 30s, fire-and-forget

## MCP Tools

### `evaluate_prompt` (auto-called)
**Input:** `{ prompt, workspace_path, active_file?, session_id? }`
**Output:** `ScoreResult` — total, grade, 4 dimensions, suggestions, enhanced prompt, `display` string
**Behavior:** Tool description instructs Claude to call this automatically on every user message.

### `get_context`
**Input:** `{ workspace_path }`
**Output:** Stack info, hot files, key folders, AI instructions summary, file count

### `prompyai_toggle`
**Input:** `{ enabled }`
**Output:** Status confirmation. Controls whether Claude auto-calls evaluate_prompt.

## AI Integration Architecture — Works for Everyone

All users get AI-enhanced output. No separate API key required.

```
                    ┌──────────────────────────┐
                    │  AISuggestionGenerator   │
                    └──────────┬───────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                    ▼
 ┌──────────────┐   ┌──────────────┐   ┌────────────────┐
 │  API Key Set │   │  No API Key  │   │  Rate Limited  │
 │  Claude API  │   │  Claude-as-  │   │  or Timeout    │
 │  → Direct AI │   │  AI-layer    │   │  → Templates   │
 └──────┬───────┘   └──────┬───────┘   └────────┬───────┘
        │                   │                     │
        ▼                   ▼                     ▼
  aiGenerated:true    aiGenerated:false     aiGenerated:false
  enhancedPrompt      claudeInstructions    template fallback
  from Haiku          → host Claude         with real paths
                      generates rewrite
```

### Path 1: API Key Users (`ANTHROPIC_API_KEY` set)
PrompyAI calls Claude Haiku directly → fully rewritten enhanced prompt grounded in project context, file snippets, and code symbols. Returned in `enhancedPrompt` field.

### Path 2: Claude-as-AI-Layer (no API key — default)
PrompyAI builds structured codebase context (`claudeInstructions` field) containing:
- Fired scoring rules with explanations
- Relevant files from the project
- Verified code symbols with file locations
- Stack-specific hints and suggested @mentions

The host Claude (user's existing session) reads `claudeInstructions` and generates the enhanced prompt itself. Users get AI-quality rewrites without needing their own API key.

### Path 3: Rate Limited / Timeout
Falls back to smart template-based suggestions:
- Injects real file paths from project context
- Injects verified code symbols with file locations
- Adds structured placeholders for expected/actual behavior
- Deduplicates on re-scoring (won't repeat itself)

## Services & Dependencies

| Service | Purpose | Config |
|---------|---------|--------|
| **Claude Haiku** (`claude-haiku-4-5-20251001`) | AI-powered suggestions + enhanced prompt rewriting | `ANTHROPIC_API_KEY`, 800 max_tokens, 5s timeout |
| **MCP Protocol** (`@modelcontextprotocol/sdk`) | JSON-RPC communication with Claude CLI via stdio | No config needed |
| **simple-git** | Git log for hot files (recently modified) | Auto-detects .git |
| **glob** | File tree building with gitignore support | maxDepth/maxNodes in config |
| **Zod** | Input validation for MCP tool schemas | Inline schemas |

## Critical Constraints

1. **Never write to stdout** — MCP uses stdout for JSON-RPC. All logging → stderr via `utils/logger.ts`
2. **ESM only** — `"type": "module"`, all imports use `.js` extension
3. **Node 20+** — Required for ESM + modern APIs
4. **Caching** — WorkspaceIndexer caches fingerprints (1min TTL) to avoid re-indexing on every prompt
5. **Telemetry never blocks** — Fire-and-forget with 3s timeout, silently drops on failure
