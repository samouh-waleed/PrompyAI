<p align="center">
  <img src="packages/landing/public/logo.png" alt="PrompyAI" width="120" />
</p>

<h1 align="center">PrompyAI</h1>

<p align="center">
  Context-aware prompt intelligence for Claude CLI.<br/>
  Scores your prompts against your real codebase — file paths, symbols, session history — and rewrites them with AI.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/prompyai-mcp"><img src="https://img.shields.io/npm/v/prompyai-mcp" alt="npm" /></a>
  <a href="https://github.com/samouh-waleed/PrompyAI/blob/main/LICENSE"><img src="https://img.shields.io/github/license/samouh-waleed/PrompyAI" alt="license" /></a>
  <a href="https://prompyai.com"><img src="https://img.shields.io/badge/website-prompyai.com-7c3aed" alt="website" /></a>
</p>

---

## What It Does

When you write a prompt in Claude CLI, PrompyAI automatically evaluates it against your actual project and returns:

- **Score** (0–100) across 4 dimensions
- **Suggestions** tailored to your project
- **AI-enhanced prompt** rewritten with real file paths, verified symbols, and codebase context

```
Prompt Score: 43/100 [D]

  Specificity         3/25  ==..............
  Context Completeness 13/25  ========........
  Task Clarity        15/25  =========.......
  File & Folder Anchoring 10/25  ======..........

Key improvements:
  1. Expand your prompt with more context
  2. Add file paths using @mentions
  3. Specify what format you expect the output in
  4. Add acceptance criteria

Try something more like:

  "Build the VS Code extension in packages/vscode-extension/ that integrates
   with the PrompyAI MCP server at packages/mcp-server/. It should provide
   real-time prompt scoring in the editor sidebar, show score breakdowns
   (specificity, context, clarity, anchoring), and offer a 'rewrite prompt'
   action. Use the shared types from packages/shared/."
```

## Quick Start

```bash
claude mcp add prompyai -- npx prompyai-mcp serve
```

That's it. No sign-up, no config files. Works immediately.

Requires Node.js 20+ and Claude CLI.

## How AI Enhancement Works

PrompyAI uses a two-layer architecture so **all users get AI-enhanced output**:

| User type | How it works |
|-----------|-------------|
| **API key users** (`ANTHROPIC_API_KEY` set) | PrompyAI calls Claude Haiku directly for fast, dedicated AI rewrites |
| **Subscription users** (no API key) | PrompyAI returns codebase context to Claude, and Claude itself generates the enhanced prompt using your existing session |

Either way, the enhanced prompt is grounded in your real project — actual file paths, verified function names, and project architecture.

## Scoring Dimensions

Each dimension scores 0–25, total 0–100.

| Dimension | What it measures |
|-----------|-----------------|
| **Specificity** | Concrete actions vs vague verbs, output format, quantitative constraints |
| **Context Completeness** | File references, error messages, expected vs actual behavior |
| **Task Clarity** | Single focused task, success criteria, unambiguous language |
| **File & Folder Anchoring** | @mentions, project entity references, verified symbol names |

**Grades:** A (90+) · B (70+) · C (50+) · D (30+) · F (<30)

## Features

- **Auto-scoring** — Evaluates every prompt automatically, no manual trigger needed
- **AI-enhanced for everyone** — API key users get Haiku rewrites; subscription users get Claude-powered rewrites via codebase context
- **Context-aware** — Indexes your file tree, tech stack, git state, and code symbols via the TypeScript Compiler API
- **Session-aware** — Reads Claude Code conversation history for multi-turn context
- **Symbol verification** — Confirms that function/class names you reference actually exist in your code
- **Monorepo support** — Detects tech stacks across workspace packages
- **Toggle** — Say "pause prompyai" or "enable prompyai" at any time

## MCP Tools

### `evaluate_prompt`

Automatically called on every user message. Scores your prompt against your project.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | yes | The prompt text to evaluate |
| `workspace_path` | yes | Absolute path to your project |
| `active_file` | no | Currently open file path |
| `session_id` | no | Claude Code session ID for multi-turn context |

### `get_context`

Returns your project summary: tech stack, recent files, key folders, AI instruction files.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `workspace_path` | yes | Absolute path to your project |

### `prompyai_toggle`

Turns auto-evaluation on or off.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `enabled` | yes | `true` to enable, `false` to disable |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Enables direct AI suggestions via Claude Haiku (optional — works without it) |
| `PROMPYAI_TELEMETRY` | No | Set to `false` to opt out of anonymous telemetry |

## Architecture

```
PrompyAI/
├── packages/
│   ├── mcp-server/     ← Core product (npm: prompyai-mcp)
│   ├── landing/        ← Website (prompyai.com)
│   └── shared/         ← Shared types for future IDE extensions
├── CLAUDE.md
└── README.md
```

### Scoring Pipeline

```
User prompt
  → WorkspaceIndexer (file tree, stack, symbols)
  → ContextResolver (map prompt to codebase)
  → HeuristicScorer (20+ rules, 4 dimensions)
  → AISuggestionGenerator (Haiku or Claude-as-AI-layer)
  → DisplayFormatter (pre-formatted output)
```

## Development

```bash
pnpm install          # Install dependencies
pnpm test             # Run tests (220 tests)
pnpm typecheck        # Type check
pnpm build            # Build
```

## Links

- **Website:** [prompyai.com](https://prompyai.com)
- **npm:** [prompyai-mcp](https://www.npmjs.com/package/prompyai-mcp)
- **MCP Registry:** [io.github.samouh-waleed/prompyai](https://registry.modelcontextprotocol.io)

## License

MIT
