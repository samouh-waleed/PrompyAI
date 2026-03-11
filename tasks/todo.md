# PrompyAI — Task Tracker

## Section 1: Project Scaffold & Workspace Indexer
- [x] Set up monorepo structure (pnpm workspaces, tsconfig, esbuild)
- [x] Install and configure dependencies
- [x] Define ProjectFingerprint interface
- [x] Implement StackDetector (7 tests: Node/Python/Rust/Go detection, malformed JSON, TS vs JS)
- [x] Implement FileCollector (6 tests: tree building, depth/node limits, gitignore, priority sort)
- [x] Implement WorkspaceIndexer (6 tests: full fingerprint, caching, git, edge cases)
- [x] Validate against sample-project fixture + PrompyAI itself

## Section 2: Hybrid Scoring (Heuristic + AI)
- [x] Define ScoreResult, DimensionScore, Suggestion interfaces (done in scaffold)
- [x] Implement ContextResolver (22 tests)
- [x] Add FiredRule + HeuristicResult types
- [x] Implement HeuristicScorer — 20+ rules across 4 dimensions (24 tests)
- [x] Implement AISuggestionGenerator — Claude Haiku + 3-layer fallback (6 tests)
- [x] Refactor ScoringEngine — 4-step pipeline (4 tests)
- [x] Delete EnhancedPromptRewriter (absorbed by AISuggestionGenerator)
- [x] Add model field to rewriter config
- [x] Validate with 5 manually crafted prompts (6 tests: vague→expert spectrum)

## Section 3: MCP Server Wiring
- [x] Implement evaluate_prompt tool (Zod schema + handler)
- [x] Implement get_context tool (Zod schema + handler)
- [x] Wire MCP server entry point (stdio transport)
- [x] Functional integration tests for evaluate_prompt handler (6 tests)
- [x] Functional integration tests for get_context handler (4 tests)
- [x] Server tool registration tests (4 tests)
- [x] JSON-RPC integration test (7 tests: init handshake, listTools, callTool evaluate+context, error responses, score ordering)
- [x] Claude CLI configuration test (7 tests: bin entry, server start/stop, unknown command, doctor via CLI, MCP metadata)

## Section 4: Claude Integration UX
- [x] DisplayFormatter — pre-formatted `display` field in ScoreResult (22 tests)
- [x] Tone-adapted suggestion intros (A=celebratory → F=critical)
- [x] Tool description instructs Claude to show `display` verbatim
- [x] Enhanced prompt in fenced code block for copy-paste
- [x] Score threshold calibration (A≥90, B≥70, C≥50, D≥30, F<30)
- [x] Edge cases: perfect 100, zero score, empty suggestions, identical enhanced prompt

## Section 5: LLM-Powered Enhanced Prompt
- [x] Implement AISuggestionGenerator (moved to Section 2)
- [x] Craft AI system prompt with project context interpolation
- [x] Cost control (600 max_tokens, 5s timeout)
- [x] Fallback to template when no API key / timeout / malformed JSON

## Section 6: Polish & README
- [x] Implement `prompyai doctor` command
- [x] Error handling checklist
- [x] Write npm README

## Section 7: Smarter Scoring — Regex → Code Intelligence (v2)

### Tier 1: Fix Existing Rules
- [x] 1A. Context-aware vague verb detection (qualified 1pt vs unqualified 3pts)
- [x] 1B. camelCase/PascalCase splitting in keyword extraction
- [x] 1B. Synonym map (~30 entries) for file matching
- [x] 1C. File content snippets (top 3 files × 500 chars) passed to AI layer
- [x] 1C. FILE CONTENTS section in AI system prompt
- [x] 1C. max_tokens 600→800

### Tier 2: Code Intelligence via TypeScript Compiler API
- [x] 2A. SymbolExtractor — parse-only TS compiler API (~5ms/file)
- [x] 2A. Extracts functions, classes, interfaces, types, enums, methods, imports
- [x] 2A. 11 tests for SymbolExtractor
- [x] 2A. Move `typescript` from devDeps to deps
- [x] 2B. symbolIndex in ProjectFingerprint (hot files + src files, cap 30)
- [x] 2C. resolveSymbolReferences in ContextResolver
- [x] 2D. verified_symbol_ref bonus (+3pts/symbol, max 9pts)
- [x] 2D. nonexistent_symbol_ref penalty (-2pts/symbol, max 6pts)
- [x] 2D. symbol_file_mismatch penalty (-3pts when symbol in different file)
- [x] 2E. CODE SYMBOLS section in AI system prompt
- [x] Updated tests: HeuristicScorer (31), ContextResolver (30), AISuggestionGenerator (6)

### Verification
- [x] pnpm typecheck — zero errors
- [x] pnpm test — 166/166 pass
- [x] pnpm build — clean build

## Section 8: Publish
- [ ] npm publish
- [ ] MCP server directory submission
- [ ] Distribution channels
