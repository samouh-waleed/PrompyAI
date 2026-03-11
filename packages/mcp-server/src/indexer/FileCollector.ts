import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { FileNode } from './types.js';
import { safeReadFile } from '../utils/fileUtils.js';
import { logError } from '../utils/logger.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', 'target', '.cargo', 'vendor', 'coverage',
  '.turbo', '.cache',
]);

const PRIORITY_DIRS = new Set(['src', 'lib', 'app']);

/**
 * Collects the file tree for a workspace, respecting ignore rules and depth limits.
 */
export class FileCollector {
  async collectFileTree(
    workspacePath: string,
    maxDepth: number = 6,
    maxNodes: number = 500,
  ): Promise<FileNode[]> {
    try {
      const s = await stat(workspacePath);
      if (!s.isDirectory()) return [];
    } catch {
      logError(`Workspace path not accessible: ${workspacePath}`);
      return [];
    }

    const gitignorePatterns = await this.parseGitignore(workspacePath);
    const counter = { count: 0 };

    return this.walkDir(workspacePath, workspacePath, 0, maxDepth, maxNodes, gitignorePatterns, counter);
  }

  isIgnoredDir(name: string): boolean {
    return IGNORED_DIRS.has(name);
  }

  private async walkDir(
    dirPath: string,
    rootPath: string,
    depth: number,
    maxDepth: number,
    maxNodes: number,
    gitignorePatterns: string[],
    counter: { count: number },
  ): Promise<FileNode[]> {
    if (depth >= maxDepth || counter.count >= maxNodes) return [];

    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }

    // Sort: priority dirs first, then alphabetical
    entries.sort((a, b) => {
      const aPriority = a.isDirectory() && PRIORITY_DIRS.has(a.name) ? 0 : 1;
      const bPriority = b.isDirectory() && PRIORITY_DIRS.has(b.name) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.name.localeCompare(b.name);
    });

    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (counter.count >= maxNodes) break;

      // Skip hidden files/dirs (starting with .) except known ones
      if (entry.name.startsWith('.') && !entry.name.startsWith('.github')) continue;

      const fullPath = join(dirPath, entry.name);
      const relPath = relative(rootPath, fullPath);

      if (entry.isDirectory()) {
        if (this.isIgnoredDir(entry.name)) continue;
        if (this.matchesGitignore(relPath, gitignorePatterns)) continue;

        counter.count++;
        const children = await this.walkDir(
          fullPath, rootPath, depth + 1, maxDepth, maxNodes, gitignorePatterns, counter,
        );

        nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
      } else if (entry.isFile()) {
        if (this.matchesGitignore(relPath, gitignorePatterns)) continue;

        counter.count++;
        nodes.push({ name: entry.name, path: relPath, type: 'file' });
      }
    }

    return nodes;
  }

  private async parseGitignore(workspacePath: string): Promise<string[]> {
    const content = await safeReadFile(join(workspacePath, '.gitignore'));
    if (!content) return [];

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  }

  private matchesGitignore(relPath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Simple pattern matching: exact match or directory prefix
      const cleanPattern = pattern.replace(/\/$/, '');
      if (relPath === cleanPattern) return true;
      if (relPath.startsWith(cleanPattern + '/')) return true;
      // Match basename for patterns without slashes
      if (!cleanPattern.includes('/')) {
        const basename = relPath.split('/').pop();
        if (basename === cleanPattern) return true;
      }
    }
    return false;
  }
}
