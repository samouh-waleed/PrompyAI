import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../../src/utils/rateLimiter.js';

describe('RateLimiter', () => {
  it('should allow calls under the daily limit', () => {
    const limiter = new RateLimiter(5, 1000);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check().allowed).toBe(true);
      limiter.record();
    }
  });

  it('should block calls exceeding daily limit', () => {
    const limiter = new RateLimiter(3, 1000);
    for (let i = 0; i < 3; i++) {
      limiter.record();
    }
    const result = limiter.check();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Daily limit');
  });

  it('should block calls exceeding global monthly limit', () => {
    const limiter = new RateLimiter(1000, 2); // Global limit of 2
    limiter.record();
    limiter.record();
    const result = limiter.check();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Global monthly limit');
  });

  it('should report usage stats', () => {
    const limiter = new RateLimiter(100, 50000);
    limiter.record();
    limiter.record();
    const stats = limiter.getStats();
    expect(stats.machineToday).toBe(2);
    expect(stats.globalMonth).toBe(2);
    expect(stats.dailyLimit).toBe(100);
    expect(stats.monthlyLimit).toBe(50000);
  });

  it('should use defaults when no args provided', () => {
    const limiter = new RateLimiter();
    const stats = limiter.getStats();
    expect(stats.dailyLimit).toBe(100);
    expect(stats.monthlyLimit).toBe(178_000);
  });
});
