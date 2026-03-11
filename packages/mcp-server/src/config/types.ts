export interface PrompyAIConfig {
  scoring: {
    autoEvalThreshold: number;
    suggestThreshold: number;
    maxFileTreeDepth: number;
    maxFileTreeNodes: number;
  };
  rewriter: {
    enabled: boolean;
    model: string;
    maxTokens: number;
    timeoutMs: number;
  };
  rateLimit: {
    dailyLimitPerMachine: number;
    monthlyGlobalLimit: number;
  };
  telemetry: {
    enabled: boolean;
  };
}
