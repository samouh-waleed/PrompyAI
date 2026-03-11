# prompyai-mcp

Context-aware prompt intelligence MCP server for Claude CLI. Scores your developer prompts against your real codebase, suggests improvements, and rewrites enhanced prompts.

## What it does

When you write a prompt in Claude CLI, PrompyAI automatically analyzes it against your actual project — files, tech stack, conventions, session history — and returns:

- **Score** (0-100) across 4 dimensions: specificity, context, clarity, anchoring
- **Suggestions** with concrete examples tailored to your project
- **Enhanced prompt** rewritten with the improvements applied

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

## Install

```bash
npm install -g prompyai-mcp
```

Requires Node.js 20+.

## Setup with Claude CLI

```bash
claude mcp add prompyai -- npx prompyai-mcp serve
```

Or add to `~/.claude/claude_desktop_config.json`:

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

## MCP Tools

### `evaluate_prompt`

Automatically called on every user message. Scores a prompt against your project codebase.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | yes | The prompt text to evaluate |
| `workspace_path` | yes | Absolute path to your project |
| `active_file` | no | Currently open file path |
| `session_id` | no | Claude Code session ID for multi-turn context |

Returns a JSON result with a pre-formatted `display` field that Claude shows directly.

### `get_context`

Returns a summary of your project: detected tech stack, recently modified files, key folders, and AI instruction summaries.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `workspace_path` | yes | Absolute path to your project |

### `prompyai_toggle`

Turns auto-evaluation on or off. Enabled by default. Say "pause prompyai" or "enable prompyai" in Claude CLI.

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

- **Session-aware** — Reads Claude Code JSONL transcripts for multi-turn context
- **Multi-agent aware** — Includes subagent research in scoring context
- **Monorepo support** — Detects tech stacks across workspace packages
- **AI-powered suggestions** — Claude Haiku generates context-aware improvements
- **Template fallback** — Works without an API key using heuristic scoring
- **Rate limiting** — 100 AI calls/day per machine, graceful fallback
- **Anonymous telemetry** — Usage stats only, opt-out with `PROMPYAI_TELEMETRY=false`

## AI-Powered Suggestions

When `ANTHROPIC_API_KEY` is set, PrompyAI uses Claude Haiku to generate context-aware suggestions grounded in your project structure. Without an API key, it falls back to smart template-based suggestions from the heuristic analysis.

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

- **Per machine:** 100 AI-enhanced evaluations per day
- **Global:** Monthly cost cap
- **When limits hit:** Heuristic scoring continues, AI suggestions paused

## Programmatic API

```typescript
import { WorkspaceIndexer, ScoringEngine } from 'prompyai-mcp';

const indexer = new WorkspaceIndexer();
const scorer = new ScoringEngine();

const fingerprint = await indexer.getFingerprint('/path/to/project');
const result = await scorer.evaluate('fix the auth', fingerprint);

console.log(result.display); // Pre-formatted score output
console.log(result.total);   // 0-100
console.log(result.grade);   // A-F
```

## License

MIT
