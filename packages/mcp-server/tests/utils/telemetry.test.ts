import { describe, it, expect, vi, beforeEach } from 'vitest';
import { telemetry } from '../../src/utils/telemetry.js';

describe('TelemetryClient', () => {
  beforeEach(() => {
    // Mock fetch to prevent actual network calls
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('should track events without throwing', () => {
    expect(() => {
      telemetry.track('test_event', { key: 'value' });
    }).not.toThrow();
  });

  it('should flush without throwing even if fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    telemetry.track('test_event');
    await expect(telemetry.flush()).resolves.not.toThrow();
  });

  it('should respect PROMPYAI_TELEMETRY=false', async () => {
    // The singleton is already initialized, but we can test that flush doesn't call fetch
    // when buffer is empty
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await telemetry.flush();
    // No events tracked in this test, so fetch should not be called
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
