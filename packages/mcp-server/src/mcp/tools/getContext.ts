import type { WorkspaceIndexer } from '../../indexer/WorkspaceIndexer.js';
import type { GetContextInput } from '../types.js';
import { log, logError } from '../../utils/logger.js';

export const GET_CONTEXT_TOOL = {
  name: 'get_context',
  description:
    'Returns a lightweight summary of the project context: detected tech stack, recently modified files, key folders, and AI instruction summaries.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      workspace_path: { type: 'string', description: 'Absolute path to the project workspace' },
    },
    required: ['workspace_path'],
  },
};

export async function handleGetContext(
  args: GetContextInput,
  indexer: WorkspaceIndexer,
): Promise<string> {
  log(`Getting context for workspace: ${args.workspace_path}`);

  try {
    const fingerprint = await indexer.getFingerprint(args.workspace_path);

    const summary = {
      stack: fingerprint.stack,
      hotFiles: fingerprint.hotFiles,
      keyFolders: fingerprint.keyFolders,
      aiInstructionsSummary: fingerprint.aiInstructions.slice(0, 500),
      fileCount: countFiles(fingerprint.fileTree ?? []),
      lastIndexed: fingerprint.lastIndexed,
    };

    return JSON.stringify(summary, null, 2);
  } catch (err) {
    logError(`Failed to get context for ${args.workspace_path}`, err);
    throw err;
  }
}

function countFiles(nodes: { children?: unknown[] }[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children) {
      count += countFiles(node.children as { children?: unknown[] }[]);
    }
  }
  return count;
}
