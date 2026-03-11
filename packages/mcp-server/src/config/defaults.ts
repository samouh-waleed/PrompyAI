import type { PrompyAIConfig } from './types.js';

export const DEFAULT_CONFIG: PrompyAIConfig = {
  scoring: {
    autoEvalThreshold: 70,
    suggestThreshold: 50,
    maxFileTreeDepth: 3,
    maxFileTreeNodes: 500,
  },
  rewriter: {
    enabled: true,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 600,
    timeoutMs: 5000,
  },
  rateLimit: {
    dailyLimitPerMachine: 100,
    monthlyGlobalLimit: 178_000, // ~$500/month at ~$0.0028/call
  },
  telemetry: {
    enabled: true,
  },
};
