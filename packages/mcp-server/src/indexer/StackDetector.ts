import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import type { TechStack } from './types.js';
import { safeReadFile, fileExists } from '../utils/fileUtils.js';
import { logError } from '../utils/logger.js';

/**
 * Detects the tech stack of a project by reading manifest files.
 * Sources: package.json, pyproject.toml, Cargo.toml, go.mod, tsconfig.json
 */
export class StackDetector {
  async detect(workspacePath: string): Promise<TechStack> {
    // Priority: package.json → pyproject.toml → Cargo.toml → go.mod
    if (await fileExists(join(workspacePath, 'package.json'))) {
      return this.detectFromNode(workspacePath);
    }
    if (await fileExists(join(workspacePath, 'pyproject.toml'))) {
      return this.detectFromPython(workspacePath);
    }
    if (await fileExists(join(workspacePath, 'Cargo.toml'))) {
      return { runtime: 'rust', framework: null, uiLibrary: null, orm: null, testRunner: 'cargo-test', styling: null, language: 'rust' };
    }
    if (await fileExists(join(workspacePath, 'go.mod'))) {
      return { runtime: 'go', framework: null, uiLibrary: null, orm: null, testRunner: null, styling: null, language: 'go' };
    }

    return { runtime: 'unknown', framework: null, uiLibrary: null, orm: null, testRunner: null, styling: null, language: 'javascript' };
  }

  private async detectFromNode(workspacePath: string): Promise<TechStack> {
    const raw = await safeReadFile(join(workspacePath, 'package.json'));
    if (!raw) {
      return { runtime: 'node', framework: null, uiLibrary: null, orm: null, testRunner: null, styling: null, language: 'javascript' };
    }

    let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      pkg = JSON.parse(raw);
    } catch (err) {
      logError('Failed to parse package.json', err);
      return { runtime: 'node', framework: null, uiLibrary: null, orm: null, testRunner: null, styling: null, language: 'javascript' };
    }

    const allDeps = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);

    // For monorepos, also scan workspace packages' dependencies
    const isMonorepo = await fileExists(join(workspacePath, 'pnpm-workspace.yaml'))
      || (pkg as Record<string, unknown>).workspaces != null;
    if (isMonorepo) {
      await this.collectWorkspaceDeps(workspacePath, allDeps);
    }

    const has = (name: string) => allDeps.has(name);

    const framework = has('next') ? 'nextjs'
      : has('express') ? 'express'
      : has('fastify') ? 'fastify'
      : has('hono') ? 'hono'
      : has('nuxt') ? 'nuxt'
      : null;

    const uiLibrary = has('react') ? 'react'
      : has('vue') ? 'vue'
      : has('svelte') ? 'svelte'
      : has('@angular/core') ? 'angular'
      : null;

    const orm = (has('prisma') || has('@prisma/client')) ? 'prisma'
      : has('drizzle-orm') ? 'drizzle'
      : has('typeorm') ? 'typeorm'
      : has('sequelize') ? 'sequelize' as TechStack['orm']
      : has('mongoose') ? 'mongoose'
      : null;

    const testRunner = has('vitest') ? 'vitest'
      : has('jest') ? 'jest'
      : null;

    const styling = has('tailwindcss') ? 'tailwind'
      : has('styled-components') ? 'styled-components'
      : null;

    const isTypeScript = await fileExists(join(workspacePath, 'tsconfig.json'))
      || await fileExists(join(workspacePath, 'tsconfig.base.json'));
    const language = isTypeScript ? 'typescript' as const : 'javascript' as const;

    return { runtime: 'node', framework, uiLibrary, orm, testRunner, styling, language };
  }

  private async collectWorkspaceDeps(workspacePath: string, allDeps: Set<string>): Promise<void> {
    // Scan common workspace locations: packages/*, apps/*
    for (const dir of ['packages', 'apps']) {
      const dirPath = join(workspacePath, dir);
      if (!(await fileExists(dirPath))) continue;

      try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const pkgPath = join(dirPath, entry.name, 'package.json');
          const raw = await safeReadFile(pkgPath);
          if (!raw) continue;
          try {
            const childPkg = JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
            for (const dep of Object.keys(childPkg.dependencies ?? {})) allDeps.add(dep);
            for (const dep of Object.keys(childPkg.devDependencies ?? {})) allDeps.add(dep);
          } catch { /* skip malformed */ }
        }
      } catch { /* skip unreadable */ }
    }
  }

  private async detectFromPython(workspacePath: string): Promise<TechStack> {
    const content = await safeReadFile(join(workspacePath, 'pyproject.toml'));

    let framework: TechStack['framework'] = null;
    let testRunner: TechStack['testRunner'] = null;
    let orm: TechStack['orm'] = null;

    if (content) {
      const lower = content.toLowerCase();
      if (lower.includes('fastapi')) framework = 'fastapi';
      else if (lower.includes('django')) framework = 'django';
      else if (lower.includes('flask')) framework = 'flask';

      if (lower.includes('pytest')) testRunner = 'pytest';
      if (lower.includes('sqlalchemy')) orm = 'sqlalchemy';
    }

    return { runtime: 'python', framework, uiLibrary: null, orm, testRunner, styling: null, language: 'python' };
  }
}
