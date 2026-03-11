export interface Env {
  DB: D1Database;
}

interface TelemetryEvent {
  event: string;
  version?: string;
  machine_id?: string;
  timestamp?: number;
  properties?: Record<string, string | number | boolean>;
}

interface TelemetryPayload {
  events: TelemetryEvent[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Health check
    if (request.method === 'GET') {
      return json({ status: 'ok', service: 'prompyai-telemetry' });
    }

    // Only accept POST /telemetry
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    try {
      const body = (await request.json()) as TelemetryPayload;

      if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
        return json({ error: 'No events provided' }, 400);
      }

      // Cap at 100 events per request to prevent abuse
      const events = body.events.slice(0, 100);

      // Batch insert
      const stmt = env.DB.prepare(
        'INSERT INTO events (event, version, machine_id, timestamp, properties) VALUES (?, ?, ?, ?, ?)',
      );

      const batch = events.map((e) =>
        stmt.bind(
          e.event ?? 'unknown',
          e.version ?? null,
          e.machine_id ?? null,
          e.timestamp ?? Date.now(),
          e.properties ? JSON.stringify(e.properties) : null,
        ),
      );

      await env.DB.batch(batch);

      return json({ accepted: events.length });
    } catch (err) {
      return json({ error: 'Invalid request' }, 400);
    }
  },
} satisfies ExportedHandler<Env>;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
