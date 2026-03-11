import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../utils/logger.js';

interface CheckResult {
  label: string;
  ok: boolean;
  message: string;
  optional?: boolean;
}

/**
 * Runs diagnostic checks on the user's environment.
 * Usage: prompyai doctor --workspace /path/to/project
 */
export async function runDoctor(workspacePath?: string): Promise<void> {
  const results: CheckResult[] = [];
  const workspace = workspacePath ?? process.cwd();

  // Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1), 10);
  results.push({
    label: 'Node.js version',
    ok: majorVersion >= 20,
    message: `${nodeVersion} (required: >=20)`,
  });

  // Workspace exists
  results.push({
    label: 'Workspace path exists',
    ok: existsSync(workspace),
    message: workspace,
  });

  // Git repository
  results.push({
    label: 'Git repository detected',
    ok: existsSync(resolve(workspace, '.git')),
    message: existsSync(resolve(workspace, '.git')) ? 'Yes' : 'No .git directory found',
  });

  // Package manifest
  const hasPackageJson = existsSync(resolve(workspace, 'package.json'));
  const hasPyproject = existsSync(resolve(workspace, 'pyproject.toml'));
  const hasCargoToml = existsSync(resolve(workspace, 'Cargo.toml'));
  const hasGoMod = existsSync(resolve(workspace, 'go.mod'));
  results.push({
    label: 'Project manifest found',
    ok: hasPackageJson || hasPyproject || hasCargoToml || hasGoMod,
    message: hasPackageJson ? 'package.json' : hasPyproject ? 'pyproject.toml' : hasCargoToml ? 'Cargo.toml' : hasGoMod ? 'go.mod' : 'None found',
  });

  // AI instructions
  const hasClaudeMd = existsSync(resolve(workspace, 'CLAUDE.md'));
  results.push({
    label: 'AI instruction file',
    ok: hasClaudeMd,
    message: hasClaudeMd ? 'CLAUDE.md found' : 'No CLAUDE.md found (optional)',
    optional: true,
  });

  // Anthropic API key
  results.push({
    label: 'ANTHROPIC_API_KEY',
    ok: !!process.env.ANTHROPIC_API_KEY,
    message: process.env.ANTHROPIC_API_KEY
      ? 'Set (LLM rewriting enabled)'
      : 'Not set — enhanced rewriting disabled. Free scoring still works.',
    optional: true,
  });

  // Print results
  const version = '0.1.0';
  process.stderr.write(`\nPrompyAI Doctor v${version}\n`);
  process.stderr.write('─'.repeat(45) + '\n');

  let warnings = 0;
  let errors = 0;

  for (const r of results) {
    const icon = r.ok ? '✓' : r.optional ? '⚠' : '✗';
    process.stderr.write(`${icon} ${r.label}: ${r.message}\n`);
    if (!r.ok && r.optional) warnings++;
    if (!r.ok && !r.optional) errors++;
  }

  process.stderr.write('\n');
  if (errors > 0) {
    process.stderr.write(`Overall: ${errors} error(s), ${warnings} warning(s)\n`);
  } else if (warnings > 0) {
    process.stderr.write(`Overall: Ready (${warnings} optional warning(s))\n`);
  } else {
    process.stderr.write('Overall: Ready\n');
  }

  log('Doctor check complete');
}
