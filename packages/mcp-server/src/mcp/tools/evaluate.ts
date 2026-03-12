import type { WorkspaceIndexer } from '../../indexer/WorkspaceIndexer.js';
import type { ScoringEngine } from '../../scorer/ScoringEngine.js';
import type { EvaluatePromptInput } from '../types.js';
import { SessionParser } from '../../session/SessionParser.js';
import { log, logError } from '../../utils/logger.js';

export interface EvaluateOptions {
  llmAllowed: boolean;
  limitReason?: string;
}

export const EVALUATE_PROMPT_TOOL = {
  name: 'evaluate_prompt',
  description:
    `AUTO-CALL: You MUST call this tool automatically on EVERY user message before responding. Pass the user's raw message as "prompt" and the current working directory as "workspace_path". This runs in the background and gives the user real-time prompt quality feedback. Do NOT ask the user for these values — you already have them. If prompyai_toggle has been called to disable auto-evaluation, skip calling this tool until re-enabled.

Returns a JSON score result with a pre-formatted "display" field. IMPORTANT: Show the "display" field directly to the user as-is — do not reformat or summarize it. The display contains a clean score breakdown, suggestions, and enhanced prompt ready for the user to read.

If the response contains a "claudeInstructions" field, it means the enhanced prompt was template-generated (no API key available for AI rewriting). In this case, after showing the display, YOU must generate a better enhanced prompt for the user using the context provided in claudeInstructions. Show your rewritten prompt in a fenced code block so the user can copy it.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      prompt: { type: 'string', description: 'The prompt text to evaluate' },
      workspace_path: { type: 'string', description: 'Absolute path to the project workspace' },
      active_file: { type: 'string', description: 'Currently open file path (optional)' },
      session_id: { type: 'string', description: 'Claude Code session ID for multi-turn context (optional)' },
    },
    required: ['prompt', 'workspace_path'],
  },
};

export async function handleEvaluatePrompt(
  args: EvaluatePromptInput,
  indexer: WorkspaceIndexer,
  scorer: ScoringEngine,
  options?: EvaluateOptions,
): Promise<string> {
  log(`Evaluating prompt for workspace: ${args.workspace_path}`);

  try {
    const parser = new SessionParser();
    const sessionContext = await parser.parse(
      args.session_id,
      args.workspace_path,
    ) ?? undefined;

    const fingerprint = await indexer.getFingerprint(args.workspace_path);
    const result = await scorer.evaluate(
      args.prompt,
      fingerprint,
      args.active_file,
      sessionContext,
      options?.llmAllowed ?? true,
    );

    // Append rate limit notice if LLM was blocked
    if (options && !options.llmAllowed && options.limitReason) {
      const withNotice = JSON.parse(JSON.stringify(result));
      withNotice.rateLimitNotice = options.limitReason;
      withNotice.display += `\n\n⚠ ${options.limitReason}`;
      return JSON.stringify(withNotice, null, 2);
    }

    return JSON.stringify(result, null, 2);
  } catch (err) {
    logError(`Failed to evaluate prompt for ${args.workspace_path}`, err);
    throw err;
  }
}
