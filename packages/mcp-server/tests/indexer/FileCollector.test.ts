import { describe, it, expect } from 'vitest';
import { FileCollector } from '../../src/indexer/FileCollector.js';
import { resolve } from 'node:path';

describe('FileCollector', () => {
  const collector = new FileCollector();
  const fixturePath = resolve(__dirname, '../fixtures/sample-project');

  it('should ignore standard directories', () => {
    expect(collector.isIgnoredDir('node_modules')).toBe(true);
    expect(collector.isIgnoredDir('.git')).toBe(true);
    expect(collector.isIgnoredDir('dist')).toBe(true);
    expect(collector.isIgnoredDir('src')).toBe(false);
    expect(collector.isIgnoredDir('lib')).toBe(false);
  });

  it('should return tree for sample-project fixture', async () => {
    const tree = await collector.collectFileTree(fixturePath);
    expect(tree.length).toBeGreaterThan(0);

    // Should find the src directory
    const srcNode = tree.find((n) => n.name === 'src');
    expect(srcNode).toBeDefined();
    expect(srcNode?.type).toBe('directory');
    expect(srcNode?.children).toBeDefined();
  });

  it('should respect maxDepth=1', async () => {
    const tree = await collector.collectFileTree(fixturePath, 1);
    // Only top-level entries, no nested children
    for (const node of tree) {
      if (node.type === 'directory') {
        expect(node.children).toEqual([]);
      }
    }
  });

  it('should respect maxNodes limit', async () => {
    const tree = await collector.collectFileTree(fixturePath, 3, 2);
    const countNodes = (nodes: typeof tree): number =>
      nodes.reduce((acc, n) => acc + 1 + countNodes(n.children ?? []), 0);
    expect(countNodes(tree)).toBeLessThanOrEqual(2);
  });

  it('should return empty array for non-existent path', async () => {
    const tree = await collector.collectFileTree('/nonexistent/path/xyz');
    expect(tree).toEqual([]);
  });

  it('should prioritize src/lib/app directories first', async () => {
    const tree = await collector.collectFileTree(fixturePath);
    const dirNames = tree
      .filter((n) => n.type === 'directory')
      .map((n) => n.name);

    if (dirNames.includes('src')) {
      // src should appear before non-priority dirs
      const srcIdx = dirNames.indexOf('src');
      const nonPriorityIdx = dirNames.findIndex(
        (name) => !['src', 'lib', 'app'].includes(name),
      );
      if (nonPriorityIdx >= 0) {
        expect(srcIdx).toBeLessThan(nonPriorityIdx);
      }
    }
  });
});
