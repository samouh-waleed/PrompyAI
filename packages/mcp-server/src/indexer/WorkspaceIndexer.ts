import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import type { ProjectFingerprint, FileNode, TechStack, FileSymbols } from './types.js';
import { StackDetector } from './StackDetector.js';
import { FileCollector } from './FileCollector.js';
import { SymbolExtractor } from './SymbolExtractor.js';
import { Cache } from '../utils/cache.js';
import { safeReadFile } from '../utils/fileUtils.js';
import { log, logError } from '../utils/logger.js';

const AI_INSTRUCTION_FILES = [
  'CLAUDE.md',
  '.cursorrules',
  'AGENTS.md',
  '.github/copilot-instructions.md',
];

const KEY_FOLDER_NAMES = new Set([
  'src', 'lib', 'app', 'api', 'components', 'pages', 'routes',
  'utils', 'hooks', 'services', 'middleware', 'models', 'schemas',
  'config', 'tests', 'test', '__tests__',
]);

/**
 * Reads a workspace and produces a ProjectFingerprint.
 * Runs once on first call and caches the result.
 */
export class WorkspaceIndexer {
  private cache = new Cache<ProjectFingerprint>(60_000);
  private stackDetector = new StackDetector();
  private fileCollector = new FileCollector();
  private symbolExtractor = new SymbolExtractor();

  async getFingerprint(workspacePath: string): Promise<ProjectFingerprint> {
    const cached = this.cache.get(workspacePath);
    if (cached) return cached;

    log(`Indexing workspace: ${workspacePath}`);
    const fingerprint = await this.buildFingerprint(workspacePath);
    this.cache.set(workspacePath, fingerprint);
    return fingerprint;
  }

  private async buildFingerprint(
    workspacePath: string,
  ): Promise<ProjectFingerprint> {
    const indexingErrors: string[] = [];

    // 1. Detect tech stack
    const stack = await this.stackDetector.detect(workspacePath);

    // 2. Collect file tree (3 levels deep, max 500 nodes)
    const fileTree = await this.fileCollector.collectFileTree(workspacePath);

    // 3. Read git log for hot files
    const hotFiles = await this.getHotFiles(workspacePath, indexingErrors);

    // 4. Read AI instruction files
    const aiInstructions = await this.readAiInstructions(workspacePath);

    // 5. Read README summary (first 1500 chars)
    const readmeSummary = (await safeReadFile(join(workspacePath, 'README.md'), 1500)) ?? '';

    // 6. Extract key folders from file tree
    const keyFolders = this.extractKeyFolders(fileTree);

    // 7. Derive convention hints from stack + AI instructions
    const conventionHints = this.deriveConventionHints(stack, aiInstructions);

    // 8. Extract code symbols from hot files + top-level src files
    const symbolIndex = await this.buildSymbolIndex(workspacePath, fileTree, hotFiles, indexingErrors);

    return {
      workspacePath,
      stack,
      fileTree,
      hotFiles,
      aiInstructions,
      conventionHints,
      readmeSummary,
      keyFolders,
      lastIndexed: new Date(),
      indexingErrors,
      symbolIndex,
    };
  }

  /**
   * Read the first N characters of a file for use as a content snippet.
   */
  async readFileSnippet(
    workspacePath: string,
    filePath: string,
    maxChars = 500,
  ): Promise<string | null> {
    const fullPath = join(workspacePath, filePath);
    return safeReadFile(fullPath, maxChars);
  }

  private async buildSymbolIndex(
    workspacePath: string,
    fileTree: FileNode[],
    hotFiles: string[],
    indexingErrors: string[],
  ): Promise<FileSymbols[]> {
    try {
      // Collect candidate files: hot files + top-level src files
      const candidatePaths = new Set<string>();

      // Add hot files that are TS/JS
      for (const f of hotFiles) {
        if (/\.[tj]sx?$/.test(f)) {
          candidatePaths.add(f);
        }
      }

      // Add src files (search recursively for src/ dirs to support monorepos)
      this.findSrcDirs(fileTree, candidatePaths);

      if (candidatePaths.size === 0) return [];

      const absolutePaths = [...candidatePaths].map((p) => join(workspacePath, p));
      const results = await this.symbolExtractor.extractFiles(absolutePaths, 30);

      // Normalize paths back to relative
      return results.map((r) => ({
        ...r,
        filePath: r.filePath.startsWith(workspacePath)
          ? r.filePath.slice(workspacePath.length + 1)
          : r.filePath,
      }));
    } catch (err) {
      logError('Symbol extraction failed', err);
      indexingErrors.push('Symbol extraction failed — symbolIndex unavailable');
      return [];
    }
  }

  private findSrcDirs(nodes: FileNode[], paths: Set<string>, depth = 0): void {
    if (depth > 4) return; // Don't go too deep looking for src/
    for (const node of nodes) {
      if (node.type === 'directory') {
        if (node.name === 'src' && node.children) {
          this.collectTsFiles(node.children, paths);
        } else if (node.children && node.name !== 'node_modules' && node.name !== '.git') {
          this.findSrcDirs(node.children, paths, depth + 1);
        }
      }
    }
  }

  private collectTsFiles(nodes: FileNode[], paths: Set<string>, depth = 0): void {
    if (depth > 3) return; // Don't go too deep
    for (const node of nodes) {
      if (node.type === 'file' && /\.[tj]sx?$/.test(node.name)) {
        paths.add(node.path);
      }
      if (node.type === 'directory' && node.children) {
        this.collectTsFiles(node.children, paths, depth + 1);
      }
    }
  }

  private async getHotFiles(
    workspacePath: string,
    indexingErrors: string[],
  ): Promise<string[]> {
    try {
      const git = simpleGit(workspacePath);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        indexingErrors.push('No git repository found — hotFiles unavailable');
        return [];
      }

      const raw = await git.raw([
        'log', '--oneline', '-20', '--name-only', '--pretty=format:',
      ]);

      const files = raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Deduplicate, preserve order (most recent first)
      return [...new Set(files)];
    } catch (err) {
      logError('Failed to read git log', err);
      indexingErrors.push('Git log read failed — hotFiles unavailable');
      return [];
    }
  }

  private async readAiInstructions(workspacePath: string): Promise<string> {
    const sections: string[] = [];

    for (const file of AI_INSTRUCTION_FILES) {
      const content = await safeReadFile(join(workspacePath, file));
      if (content) {
        sections.push(content.trim());
      }
    }

    return sections.join('\n---\n');
  }

  private extractKeyFolders(fileTree: FileNode[]): string[] {
    const folders: string[] = [];

    for (const node of fileTree) {
      if (node.type === 'directory' && KEY_FOLDER_NAMES.has(node.name)) {
        folders.push(node.path);
      }
    }

    return folders;
  }

  private deriveConventionHints(stack: TechStack, aiInstructions: string): string[] {
    const hints: string[] = [];

    if (stack.framework) hints.push(`Framework: ${stack.framework}`);
    if (stack.orm) hints.push(`ORM: ${stack.orm}`);
    if (stack.testRunner) hints.push(`Test runner: ${stack.testRunner}`);
    if (stack.uiLibrary) hints.push(`UI library: ${stack.uiLibrary}`);
    if (stack.styling) hints.push(`Styling: ${stack.styling}`);
    if (stack.language === 'typescript') hints.push('TypeScript strict mode');
    if (aiInstructions.length > 0) hints.push('AI instruction files present');

    return hints;
  }
}
