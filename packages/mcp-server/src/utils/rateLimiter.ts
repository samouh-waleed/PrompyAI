import { getMachineId } from './machineId.js';
import { log } from './logger.js';

interface UsageBucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter for LLM API calls.
 *
 * Two layers:
 * 1. Per-machine daily cap (default: 100 LLM calls/day)
 * 2. Global monthly cost cap (default: $500/month ≈ 178,000 calls)
 *
 * When limits are hit, scoring falls back to heuristic-only (no LLM).
 * The MCP server still works — just without AI-powered enhanced prompts.
 */
export class RateLimiter {
  private perMachine = new Map<string, UsageBucket>();
  private globalBucket: UsageBucket;

  private readonly dailyLimitPerMachine: number;
  private readonly monthlyGlobalLimit: number;

  constructor(
    dailyLimitPerMachine = 100,
    monthlyGlobalLimit = 178_000, // ~$500 at $0.0028/call
  ) {
    this.dailyLimitPerMachine = dailyLimitPerMachine;
    this.monthlyGlobalLimit = monthlyGlobalLimit;
    this.globalBucket = { count: 0, resetAt: this.nextMonthReset() };
  }

  /**
   * Check if an LLM call is allowed. Returns { allowed, reason }.
   */
  check(): { allowed: boolean; reason?: string } {
    const machineId = getMachineId();

    // Check global monthly limit
    if (Date.now() > this.globalBucket.resetAt) {
      this.globalBucket = { count: 0, resetAt: this.nextMonthReset() };
    }
    if (this.globalBucket.count >= this.monthlyGlobalLimit) {
      return { allowed: false, reason: 'Global monthly limit reached. LLM enhancement temporarily disabled.' };
    }

    // Check per-machine daily limit
    let bucket = this.perMachine.get(machineId);
    if (!bucket || Date.now() > bucket.resetAt) {
      bucket = { count: 0, resetAt: this.nextDayReset() };
      this.perMachine.set(machineId, bucket);
    }
    if (bucket.count >= this.dailyLimitPerMachine) {
      return {
        allowed: false,
        reason: `Daily limit of ${this.dailyLimitPerMachine} AI evaluations reached. Heuristic scoring still active. Resets at midnight UTC.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a successful LLM call.
   */
  record(): void {
    const machineId = getMachineId();

    // Increment global
    if (Date.now() > this.globalBucket.resetAt) {
      this.globalBucket = { count: 0, resetAt: this.nextMonthReset() };
    }
    this.globalBucket.count++;

    // Increment per-machine
    let bucket = this.perMachine.get(machineId);
    if (!bucket || Date.now() > bucket.resetAt) {
      bucket = { count: 0, resetAt: this.nextDayReset() };
      this.perMachine.set(machineId, bucket);
    }
    bucket.count++;
  }

  /**
   * Get current usage stats for telemetry/debugging.
   */
  getStats(): { machineToday: number; globalMonth: number; dailyLimit: number; monthlyLimit: number } {
    const machineId = getMachineId();
    const bucket = this.perMachine.get(machineId);
    const machineToday = (bucket && Date.now() <= bucket.resetAt) ? bucket.count : 0;

    return {
      machineToday,
      globalMonth: this.globalBucket.count,
      dailyLimit: this.dailyLimitPerMachine,
      monthlyLimit: this.monthlyGlobalLimit,
    };
  }

  private nextDayReset(): number {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return tomorrow.getTime();
  }

  private nextMonthReset(): number {
    const now = new Date();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return nextMonth.getTime();
  }
}
