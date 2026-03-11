import { build } from 'esbuild';

// Bundle the MCP server entry point
await build({
  entryPoints: ['src/mcp/server.ts', 'src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  external: [
    // Don't bundle native modules or large deps that work fine as node_modules
    'simple-git',
    '@modelcontextprotocol/sdk',
    '@anthropic-ai/sdk',
    'zod',
    'glob',
    'typescript',
  ],
  banner: {
    // cli.ts needs the shebang for bin usage
    js: '',
  },
});

console.error('Build complete → dist/');
