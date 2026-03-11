/**
 * Logger that writes exclusively to stderr.
 * CRITICAL: MCP servers use stdout for JSON-RPC protocol.
 * Any stdout write will corrupt the protocol and crash the connection.
 */
export function log(message: string, ...args: unknown[]): void {
  process.stderr.write(`[prompyai] ${message}\n`);
  if (args.length > 0) {
    process.stderr.write(`  ${JSON.stringify(args)}\n`);
  }
}

export function logError(message: string, error?: unknown): void {
  process.stderr.write(`[prompyai:error] ${message}\n`);
  if (error instanceof Error) {
    process.stderr.write(`  ${error.message}\n`);
  } else if (error !== undefined && error !== null) {
    try {
      process.stderr.write(`  ${JSON.stringify(error)}\n`);
    } catch {
      process.stderr.write(`  ${String(error)}\n`);
    }
  }
}
