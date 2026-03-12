import { getMachineId } from './machineId.js';
import { log, logError } from './logger.js';

export interface TelemetryEvent {
  event: string;
  version: string;
  machine_id: string;
  timestamp: number;
  properties?: Record<string, string | number | boolean>;
}

const TELEMETRY_ENDPOINT = process.env.PROMPYAI_TELEMETRY_URL ?? 'https://prompyai-telemetry.prompyai.workers.dev/telemetry';
const BATCH_INTERVAL_MS = 30_000; // Flush every 30s
const MAX_BATCH_SIZE = 50;
const VERSION = '0.1.0';

/**
 * Lightweight anonymous telemetry client.
 * - Fire-and-forget: never blocks the scoring pipeline
 * - Batched: groups events and sends periodically
 * - No PII: only hashed machine ID + event name + timestamp
 * - Respects PROMPYAI_TELEMETRY=false to opt out
 */
class TelemetryClient {
  private buffer: TelemetryEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.PROMPYAI_TELEMETRY !== 'false';

    if (this.enabled) {
      this.timer = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
      // Don't keep process alive just for telemetry
      if (this.timer.unref) this.timer.unref();
    }
  }

  private static readonly IMMEDIATE_EVENTS = new Set(['server_start']);

  track(event: string, properties?: Record<string, string | number | boolean>): void {
    if (!this.enabled) return;

    this.buffer.push({
      event,
      version: VERSION,
      machine_id: getMachineId(),
      timestamp: Date.now(),
      properties,
    });

    if (this.buffer.length >= MAX_BATCH_SIZE || TelemetryClient.IMMEDIATE_EVENTS.has(event)) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      await fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch {
      // Silently drop — telemetry must never affect the user experience
      // Put events back if we want retry (we don't — just drop)
    }
  }

  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}

// Singleton
export const telemetry = new TelemetryClient();
