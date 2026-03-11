# PrompyAI

Context-aware prompt intelligence MCP server for Claude CLI. Scores developer prompts against their real codebase, suggests improvements, and rewrites enhanced prompts.

## How It Works

When you write a prompt in Claude CLI, PrompyAI automatically evaluates it against your actual project — files, tech stack, conventions, session history — and returns a score with actionable suggestions.

```
Prompt Score: 28/100 [F]
Session context: 12 file references carried forward

  Specificity        6/25  ===...........
  Context            5/25  ==............
  Clarity           10/25  ======........
  Anchoring          7/25  ====..........

This prompt is too vague for good results. Critical fixes:
  1. Replace "fix" with what's actually broken
     > "debug the JWT validation error in @src/middleware/auth.ts"
  2. Describe expected vs actual behavior
     > "should return 200 but returns 401 when token has role claim"

Enhanced prompt:
```​
In @src/middleware/auth.ts, the JWT validation returns 401 for valid
tokens. Update validateToken to extract the role claim correctly.
Ensure existing vitest tests pass.
```​
```

## Quick Start

```bash
# Zero-install (recommended)
claude mcp add prompyai -- npx prompyai-mcp serve

# Or install globally first
npm install -g prompyai-mcp
claude mcp add prompyai -- prompyai serve
```

```json
{
  "mcpServers": {
    "prompyai": {
      "command": "npx",
      "args": ["prompyai-mcp", "serve"]
    }
  }
}
```

Requires Node.js 20+.

## MCP Tools

### `evaluate_prompt`

Automatically called on every user message. Scores your prompt and returns suggestions.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | yes | The prompt text to evaluate |
| `workspace_path` | yes | Absolute path to your project |
| `active_file` | no | Currently open file path |
| `session_id` | no | Claude Code session ID for multi-turn context |

### `get_context`

Returns a summary of your project: detected tech stack, recently modified files, key folders, and AI instruction summaries.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `workspace_path` | yes | Absolute path to your project |

### `prompyai_toggle`

Turns auto-evaluation on or off. Enabled by default.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `enabled` | yes | `true` to enable, `false` to disable |

## Scoring Dimensions

Each dimension scores 0-25, total 0-100.

| Dimension | Measures |
|-----------|----------|
| **Specificity** | Concrete actions vs vague verbs, output format, constraints |
| **Context** | File references, error messages, expected vs actual behavior |
| **Clarity** | Single focused task, success criteria, unambiguous language |
| **Anchoring** | File paths, project entity references, hot file mentions |

**Grades:** A (90+), B (70+), C (50+), D (30+), F (<30)

## Features

- **Auto-scoring** — Evaluates every prompt automatically, no manual trigger needed
- **Session-aware** — Reads Claude Code JSONL transcripts for multi-turn context
- **Multi-agent aware** — Includes subagent research in context scoring
- **Monorepo support** — Detects tech stacks across workspace packages
- **AI-powered suggestions** — Claude Haiku generates context-aware improvements (with API key)
- **Template fallback** — Heuristic-only mode works without an API key
- **Rate limiting** — 100 AI calls/day per machine, heuristic fallback when exceeded
- **Anonymous telemetry** — Usage stats only (hashed machine ID, no PII)
- **Toggle** — Turn auto-evaluation on/off at any time

## AI-Powered Suggestions

When `ANTHROPIC_API_KEY` is set, PrompyAI uses Claude Haiku to generate suggestions grounded in your project structure. Without an API key, it falls back to template-based suggestions.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Enables AI-powered suggestions via Claude Haiku |
| `PROMPYAI_TELEMETRY` | No | Set to `false` to opt out of anonymous telemetry |
| `PROMPYAI_TELEMETRY_URL` | No | Override telemetry endpoint URL |

## CLI Commands

```bash
prompyai serve              # Start the MCP server (default)
prompyai doctor             # Run environment diagnostics
  --workspace <path>        # Workspace to check (default: cwd)
```

## Rate Limits

PrompyAI includes built-in rate limiting to manage API costs:

- **Per machine:** 100 AI-enhanced evaluations per day
- **Global:** Monthly cost cap (~$500)
- **When limits hit:** Scoring continues with heuristic-only mode (no AI suggestions)

## Monorepo Structure

```
PrompyAI/
├── packages/
│   ├── mcp-server/     ← Core product (npm: prompyai-mcp)
│   ├── landing/        ← Future: prompyai.com
│   └── shared/         ← Future: shared types for IDE extensions
├── CLAUDE.md
├── ARCHITECTURE.md
└── README.md
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests (220 tests)
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector npx tsx packages/mcp-server/src/mcp/server.ts
```

## License

MIT
