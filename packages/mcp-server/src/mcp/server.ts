import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WorkspaceIndexer } from '../indexer/WorkspaceIndexer.js';
import { ScoringEngine } from '../scorer/ScoringEngine.js';
import {
  EVALUATE_PROMPT_TOOL,
  handleEvaluatePrompt,
  GET_CONTEXT_TOOL,
  handleGetContext,
  TOGGLE_TOOL,
  handleToggle,
} from './tools/index.js';
import { EvaluatePromptInputSchema, GetContextInputSchema } from './types.js';
import { log, logError } from '../utils/logger.js';
import { telemetry } from '../utils/telemetry.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { DEFAULT_CONFIG } from '../config/defaults.js';

const server = new Server(
  { name: 'prompyai', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

const indexer = new WorkspaceIndexer();
const scorer = new ScoringEngine();
const rateLimiter = new RateLimiter(
  DEFAULT_CONFIG.rateLimit.dailyLimitPerMachine,
  DEFAULT_CONFIG.rateLimit.monthlyGlobalLimit,
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [EVALUATE_PROMPT_TOOL, GET_CONTEXT_TOOL, TOGGLE_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  log(`Tool called: ${name}`);

  // Track every tool call
  telemetry.track('tool_call', { tool: name });

  try {
    if (name === 'evaluate_prompt') {
      const parsed = EvaluatePromptInputSchema.parse(args);

      // Check rate limit before LLM call
      const limit = rateLimiter.check();
      const result = await handleEvaluatePrompt(parsed, indexer, scorer, {
        llmAllowed: limit.allowed,
        limitReason: limit.reason,
      });

      // Record LLM usage if it was allowed
      if (limit.allowed && process.env.ANTHROPIC_API_KEY) {
        rateLimiter.record();
      }

      const stats = rateLimiter.getStats();
      telemetry.track('evaluate_prompt', {
        llm_used: limit.allowed && !!process.env.ANTHROPIC_API_KEY,
        daily_usage: stats.machineToday,
      });

      return { content: [{ type: 'text', text: result }] };
    }

    if (name === 'get_context') {
      const parsed = GetContextInputSchema.parse(args);
      const result = await handleGetContext(parsed, indexer);
      return { content: [{ type: 'text', text: result }] };
    }

    if (name === 'prompyai_toggle') {
      const enabled = (args as Record<string, unknown>).enabled as boolean;
      const result = handleToggle({ enabled });
      telemetry.track('toggle', { enabled });
      return { content: [{ type: 'text', text: result }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    logError(`Tool ${name} failed`, error);
    telemetry.track('tool_error', { tool: name });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
});

// Graceful error handling — never crash silently
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
});

process.on('unhandledRejection', (error) => {
  logError('Unhandled rejection', error);
});

// Graceful shutdown — flush telemetry before exit
const gracefulShutdown = async () => {
  await telemetry.shutdown();
  process.exit(0);
};
process.on('SIGINT', () => { gracefulShutdown(); });
process.on('SIGTERM', () => { gracefulShutdown(); });

const transport = new StdioServerTransport();
await server.connect(transport);
telemetry.track('server_start');
log('PrompyAI MCP server started');
