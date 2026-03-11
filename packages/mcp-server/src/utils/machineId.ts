import { createHash } from 'node:crypto';
import { hostname, userInfo } from 'node:os';

let cachedId: string | null = null;

/**
 * Returns a consistent anonymous machine identifier.
 * SHA-256 of hostname + username — no PII leaves the machine.
 */
export function getMachineId(): string {
  if (cachedId) return cachedId;

  const raw = `${hostname()}:${userInfo().username}`;
  cachedId = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return cachedId;
}
