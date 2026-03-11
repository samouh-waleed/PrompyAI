export interface TechStack {
  runtime: 'node' | 'python' | 'rust' | 'go' | 'unknown';
  framework: 'nextjs' | 'express' | 'fastapi' | 'django' | 'rails' | string | null;
  uiLibrary: 'react' | 'vue' | 'svelte' | 'angular' | null;
  orm: 'prisma' | 'drizzle' | 'typeorm' | 'sqlalchemy' | 'mongoose' | null;
  testRunner: 'jest' | 'vitest' | 'pytest' | 'cargo-test' | null;
  styling: 'tailwind' | 'cssmodules' | 'styled-components' | null;
  language: 'typescript' | 'javascript' | 'python' | 'rust' | 'go';
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'method' | 'variable';
  exported: boolean;
  signature?: string;
}

export interface ImportInfo {
  name: string;
  from: string;
}

export interface FileSymbols {
  filePath: string;
  symbols: SymbolInfo[];
  imports: ImportInfo[];
}

export interface ProjectFingerprint {
  workspacePath: string;
  stack: TechStack;
  fileTree: FileNode[];
  hotFiles: string[];
  aiInstructions: string;
  conventionHints: string[];
  readmeSummary: string;
  keyFolders: string[];
  lastIndexed: Date;
  indexingErrors: string[];
  symbolIndex?: FileSymbols[];
}
