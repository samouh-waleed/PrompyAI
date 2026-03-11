import { z } from 'zod';

export const EvaluatePromptInputSchema = z.object({
  prompt: z.string().describe('The prompt text to evaluate'),
  workspace_path: z.string().describe('Absolute path to the project workspace'),
  active_file: z.string().optional().describe('Currently open file path (optional)'),
  session_id: z.string().optional().describe('Claude Code session ID for multi-turn context (optional)'),
});

export const GetContextInputSchema = z.object({
  workspace_path: z.string().describe('Absolute path to the project workspace'),
});

export type EvaluatePromptInput = z.infer<typeof EvaluatePromptInputSchema>;
export type GetContextInput = z.infer<typeof GetContextInputSchema>;
