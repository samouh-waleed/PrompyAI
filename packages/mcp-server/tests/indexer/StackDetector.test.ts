import { describe, it, expect } from 'vitest';
import { StackDetector } from '../../src/indexer/StackDetector.js';
import { resolve } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('StackDetector', () => {
  const detector = new StackDetector();
  const fixturePath = resolve(__dirname, '../fixtures/sample-project');

  it('should detect Next.js + React + Prisma + Vitest + Tailwind + TypeScript', async () => {
    const stack = await detector.detect(fixturePath);
    expect(stack.runtime).toBe('node');
    expect(stack.framework).toBe('nextjs');
    expect(stack.uiLibrary).toBe('react');
    expect(stack.orm).toBe('prisma');
    expect(stack.testRunner).toBe('vitest');
    expect(stack.styling).toBe('tailwind');
    expect(stack.language).toBe('typescript');
  });

  it('should return unknown for empty directory', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      const stack = await detector.detect(tmpDir);
      expect(stack.runtime).toBe('unknown');
      expect(stack.framework).toBeNull();
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  it('should handle malformed package.json gracefully', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      await writeFile(join(tmpDir, 'package.json'), '{invalid json');
      const stack = await detector.detect(tmpDir);
      expect(stack.runtime).toBe('node');
      expect(stack.framework).toBeNull();
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  it('should detect Python project from pyproject.toml', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      await writeFile(join(tmpDir, 'pyproject.toml'), '[tool.poetry]\nname = "myapp"\n\n[tool.poetry.dependencies]\nfastapi = "^0.100.0"\n');
      const stack = await detector.detect(tmpDir);
      expect(stack.runtime).toBe('python');
      expect(stack.framework).toBe('fastapi');
      expect(stack.language).toBe('python');
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  it('should detect Rust project from Cargo.toml', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      await writeFile(join(tmpDir, 'Cargo.toml'), '[package]\nname = "myapp"\n');
      const stack = await detector.detect(tmpDir);
      expect(stack.runtime).toBe('rust');
      expect(stack.language).toBe('rust');
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  it('should detect Go project from go.mod', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      await writeFile(join(tmpDir, 'go.mod'), 'module github.com/user/myapp\n\ngo 1.21\n');
      const stack = await detector.detect(tmpDir);
      expect(stack.runtime).toBe('go');
      expect(stack.language).toBe('go');
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  it('should return javascript when no tsconfig.json', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'prompyai-test-'));
    try {
      await writeFile(join(tmpDir, 'package.json'), '{"dependencies":{"express":"^4.0.0"}}');
      const stack = await detector.detect(tmpDir);
      expect(stack.runtime).toBe('node');
      expect(stack.framework).toBe('express');
      expect(stack.language).toBe('javascript');
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });
});
