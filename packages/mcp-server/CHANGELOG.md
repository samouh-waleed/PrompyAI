# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-11

### Added
- Initial release
- WorkspaceIndexer with monorepo-aware stack detection
- StackDetector supporting Node, Python, Rust, Go (+ `tsconfig.base.json` for monorepos)
- FileCollector with gitignore-aware file tree building
- SymbolExtractor for code symbol indexing (recursive `src/` search in monorepos)
- HeuristicScorer with 20+ rules across 4 dimensions (session-aware)
- ContextResolver mapping prompts to project files, symbols, and stack hints
- AISuggestionGenerator with Claude Haiku + smart template fallback
- DisplayFormatter with grade-adaptive tone
- MCP server with 3 tools: `evaluate_prompt`, `get_context`, `prompyai_toggle`
- Session context auto-detection from Claude Code JSONL transcripts
- Multi-agent awareness via subagent JSONL file reading
- Auto-evaluation on every user message (toggle on/off)
- Anonymous telemetry (opt-out via `PROMPYAI_TELEMETRY=false`)
- Per-machine daily rate limiting (100/day) + global monthly cost cap
- CLI with `serve` and `doctor` commands
- 220 tests across 21 test files
