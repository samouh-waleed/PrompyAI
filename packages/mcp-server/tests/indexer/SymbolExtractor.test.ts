import { describe, it, expect } from 'vitest';
import { SymbolExtractor } from '../../src/indexer/SymbolExtractor.js';

describe('SymbolExtractor', () => {
  const extractor = new SymbolExtractor();

  describe('parseContent()', () => {
    it('should extract function declarations', () => {
      const result = extractor.parseContent('test.ts', `
        export function validateToken(token: string): boolean {
          return true;
        }
        function privateHelper() {}
      `);

      expect(result.symbols).toHaveLength(2);
      const validate = result.symbols.find((s) => s.name === 'validateToken');
      expect(validate).toBeDefined();
      expect(validate!.kind).toBe('function');
      expect(validate!.exported).toBe(true);
      expect(validate!.signature).toContain('validateToken');
      expect(validate!.signature).toContain('token: string');

      const helper = result.symbols.find((s) => s.name === 'privateHelper');
      expect(helper).toBeDefined();
      expect(helper!.exported).toBe(false);
    });

    it('should extract class declarations with methods', () => {
      const result = extractor.parseContent('test.ts', `
        export class UserService {
          async getUserById(id: string): Promise<User> {
            return {} as User;
          }
          private validate() {}
        }
      `);

      const cls = result.symbols.find((s) => s.name === 'UserService');
      expect(cls).toBeDefined();
      expect(cls!.kind).toBe('class');
      expect(cls!.exported).toBe(true);

      const method = result.symbols.find((s) => s.name === 'getUserById');
      expect(method).toBeDefined();
      expect(method!.kind).toBe('method');
      expect(method!.signature).toContain('id: string');
    });

    it('should extract interface declarations', () => {
      const result = extractor.parseContent('test.ts', `
        export interface ScoreResult {
          total: number;
          grade: string;
        }
      `);

      const iface = result.symbols.find((s) => s.name === 'ScoreResult');
      expect(iface).toBeDefined();
      expect(iface!.kind).toBe('interface');
      expect(iface!.exported).toBe(true);
    });

    it('should extract type alias declarations', () => {
      const result = extractor.parseContent('test.ts', `
        export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
      `);

      const typeAlias = result.symbols.find((s) => s.name === 'Grade');
      expect(typeAlias).toBeDefined();
      expect(typeAlias!.kind).toBe('type');
      expect(typeAlias!.exported).toBe(true);
    });

    it('should extract enum declarations', () => {
      const result = extractor.parseContent('test.ts', `
        export enum LogLevel {
          DEBUG,
          INFO,
          WARN,
          ERROR,
        }
      `);

      const enumDecl = result.symbols.find((s) => s.name === 'LogLevel');
      expect(enumDecl).toBeDefined();
      expect(enumDecl!.kind).toBe('enum');
      expect(enumDecl!.exported).toBe(true);
    });

    it('should extract arrow function exports', () => {
      const result = extractor.parseContent('test.ts', `
        export const resolveContext = (prompt: string, fingerprint: ProjectFingerprint): ResolvedContext => {
          return {} as ResolvedContext;
        };
      `);

      const fn = result.symbols.find((s) => s.name === 'resolveContext');
      expect(fn).toBeDefined();
      expect(fn!.kind).toBe('function');
      expect(fn!.exported).toBe(true);
      expect(fn!.signature).toContain('resolveContext');
    });

    it('should extract import statements', () => {
      const result = extractor.parseContent('test.ts', `
        import { readFile } from 'node:fs/promises';
        import type { ProjectFingerprint } from '../indexer/types.js';
        import Anthropic from '@anthropic-ai/sdk';
      `);

      expect(result.imports.length).toBeGreaterThanOrEqual(3);
      expect(result.imports).toContainEqual({ name: 'readFile', from: 'node:fs/promises' });
      expect(result.imports).toContainEqual({ name: 'ProjectFingerprint', from: '../indexer/types.js' });
      expect(result.imports).toContainEqual({ name: 'Anthropic', from: '@anthropic-ai/sdk' });
    });

    it('should handle TSX files', () => {
      const result = extractor.parseContent('Button.tsx', `
        import React from 'react';
        export interface ButtonProps {
          label: string;
          onClick: () => void;
        }
        export function Button({ label, onClick }: ButtonProps) {
          return <button onClick={onClick}>{label}</button>;
        }
      `);

      const iface = result.symbols.find((s) => s.name === 'ButtonProps');
      expect(iface).toBeDefined();
      expect(iface!.kind).toBe('interface');

      const fn = result.symbols.find((s) => s.name === 'Button');
      expect(fn).toBeDefined();
      expect(fn!.kind).toBe('function');
    });

    it('should handle empty files', () => {
      const result = extractor.parseContent('empty.ts', '');
      expect(result.symbols).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
    });

    it('should handle files with syntax errors gracefully', () => {
      // TS parser is lenient — it creates a source file even with errors
      const result = extractor.parseContent('bad.ts', `
        export function broken(
        // missing closing paren and brace
      `);
      // Should not throw, may or may not extract the function
      expect(result.filePath).toBe('bad.ts');
    });

    it('should extract exported variable declarations', () => {
      const result = extractor.parseContent('test.ts', `
        export const MAX_RETRIES = 3;
        const PRIVATE_CONST = 5;
      `);

      const exported = result.symbols.find((s) => s.name === 'MAX_RETRIES');
      expect(exported).toBeDefined();
      expect(exported!.kind).toBe('variable');
      expect(exported!.exported).toBe(true);

      // Private const should not be extracted (not exported, not a function)
      const priv = result.symbols.find((s) => s.name === 'PRIVATE_CONST');
      expect(priv).toBeUndefined();
    });
  });
});
