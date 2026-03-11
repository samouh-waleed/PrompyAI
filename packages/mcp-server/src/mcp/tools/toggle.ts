import { log } from '../../utils/logger.js';

/** In-memory toggle state — default: auto-evaluation ON */
let autoEvalEnabled = true;

export const TOGGLE_TOOL = {
  name: 'prompyai_toggle',
  description:
    'Toggles PrompyAI auto-evaluation on or off. When disabled, evaluate_prompt should NOT be called automatically. When enabled, evaluate_prompt MUST be called on every user message. Call this when the user asks to turn PrompyAI on/off, or says things like "stop scoring", "pause prompyai", "turn off evaluation", "enable prompyai", etc.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      enabled: {
        type: 'boolean',
        description: 'Set to true to enable auto-evaluation, false to disable',
      },
    },
    required: ['enabled'],
  },
};

export function handleToggle(args: { enabled: boolean }): string {
  autoEvalEnabled = args.enabled;
  const state = autoEvalEnabled ? 'enabled' : 'disabled';
  log(`PrompyAI auto-evaluation ${state}`);

  if (autoEvalEnabled) {
    return JSON.stringify({
      status: 'enabled',
      message: 'PrompyAI auto-evaluation is now ON. You MUST call evaluate_prompt on every user message.',
    });
  }

  return JSON.stringify({
    status: 'disabled',
    message: 'PrompyAI auto-evaluation is now OFF. Do NOT call evaluate_prompt until re-enabled.',
  });
}

export function isAutoEvalEnabled(): boolean {
  return autoEvalEnabled;
}
