# prompyai-mcp

Context-aware prompt intelligence MCP server for Claude CLI. Scores your prompts against your real codebase and rewrites them with AI.

## Install

```bash
claude mcp add prompyai -- npx prompyai-mcp serve
```

No sign-up. No config. Works immediately. Requires Node.js 20+.

## What It Does

Every time you write a prompt in Claude CLI, PrompyAI automatically:

1. **Scores it** (0–100) across Specificity, Context Completeness, Task Clarity, and File & Folder Anchoring
2. **Suggests improvements** tailored to your project
3. **Rewrites the prompt** with real file paths, verified symbols, and codebase context

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

Try something more like:

  "Build the VS Code extension in packages/vscode-extension/ that integrates
   with the PrompyAI MCP server at packages/mcp-server/. It should provide
   real-time prompt scoring in the editor sidebar, show score breakdowns
   (specificity, context, clarity, anchoring), and offer a 'rewrite prompt'
   action. Use the shared types from packages/shared/."
```

## AI Enhancement — Works for Everyone

PrompyAI uses a two-layer architecture:

- **API key users** (`ANTHROPIC_API_KEY` set) → PrompyAI calls Claude Haiku directly for fast AI rewrites
- **Subscription users** (no API key) → PrompyAI returns rich codebase context to Claude, which generates the enhanced prompt using your existing session

All users get AI-enhanced output. No separate API key required.

## How It Knows Your Codebase

PrompyAI indexes your project locally:

- **File tree** — structure, key folders, recently modified files
- **Tech stack** — language, framework, ORM, test runner detection
- **Code symbols** — functions, classes, interfaces extracted via the TypeScript Compiler API
- **Git state** — branch, dirty files, recent changes
- **Session history** — reads Claude Code conversation transcripts for multi-turn context

All indexing happens locally. Nothing is sent externally (except optional anonymous telemetry).

## MCP Tools

### `evaluate_prompt`

Auto-called on every user message. Scores your prompt against your project.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | yes | The prompt text to evaluate |
| `workspace_path` | yes | Absolute path to your project |
| `active_file` | no | Currently open file path |
| `session_id` | no | Claude Code session ID for multi-turn context |

### `get_context`

Returns your project summary: tech stack, recent files, key folders.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `workspace_path` | yes | Absolute path to your project |

### `prompyai_toggle`

Turn auto-evaluation on or off. Say "pause prompyai" or "enable prompyai" in Claude CLI.

## Desktop Config

Alternatively, add to `~/.claude/claude_desktop_config.json`:

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Enables direct AI suggestions via Claude Haiku (optional) |
| `PROMPYAI_TELEMETRY` | No | Set to `false` to opt out of anonymous telemetry |

## CLI Commands

```bash
prompyai serve              # Start the MCP server (default)
prompyai doctor             # Run environment diagnostics
  --workspace <path>        # Workspace to check (default: cwd)
```

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

## Links

- **Website:** [prompyai.com](https://prompyai.com)
- **GitHub:** [github.com/samouh-waleed/PrompyAI](https://github.com/samouh-waleed/PrompyAI)
- **MCP Registry:** [io.github.samouh-waleed/prompyai](https://registry.modelcontextprotocol.io)

## License

MIT
