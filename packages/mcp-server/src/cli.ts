#!/usr/bin/env node

import { runDoctor } from './cli/doctor.js';
import { logError } from './utils/logger.js';

const args = process.argv.slice(2);
const command = args[0];

try {
  if (command === 'doctor') {
    const workspaceIdx = args.indexOf('--workspace');
    const workspace = workspaceIdx >= 0 ? args[workspaceIdx + 1] : undefined;
    await runDoctor(workspace);
  } else if (command === 'serve' || !command) {
    // Default: start MCP server
    await import('./mcp/server.js');
  } else {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write('Usage:\n');
    process.stderr.write('  prompyai serve           Start the MCP server\n');
    process.stderr.write('  prompyai doctor          Run environment diagnostics\n');
    process.stderr.write('    --workspace <path>     Workspace to check (default: cwd)\n');
    process.exit(1);
  }
} catch (err) {
  logError('Fatal error', err);
  process.exit(1);
}
