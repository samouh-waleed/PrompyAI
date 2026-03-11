import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { log, logError } from '../utils/logger.js';
import type { FileSymbols, SymbolInfo, ImportInfo } from './types.js';

/**
 * Extracts code symbols from TypeScript/JavaScript files using the TS compiler API
 * in parse-only mode (~5ms/file). No type-checking, just AST parsing.
 */
export class SymbolExtractor {
  /**
   * Extract symbols from a single file.
   */
  async extractFile(filePath: string): Promise<FileSymbols | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.parseContent(filePath, content);
    } catch (err) {
      logError(`Failed to extract symbols from ${filePath}`, err);
      return null;
    }
  }

  /**
   * Parse file content and extract symbols without reading from disk.
   */
  parseContent(filePath: string, content: string): FileSymbols {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      false,
      filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS,
    );

    const symbols: SymbolInfo[] = [];
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node) => {
      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        symbols.push({
          name: node.name.text,
          kind: 'function',
          exported: hasExportModifier(node),
          signature: buildFunctionSignature(node, sourceFile),
        });
      }

      // Class declarations
      if (ts.isClassDeclaration(node) && node.name) {
        symbols.push({
          name: node.name.text,
          kind: 'class',
          exported: hasExportModifier(node),
        });

        // Extract methods within the class
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            symbols.push({
              name: member.name.text,
              kind: 'method',
              exported: hasExportModifier(node), // inherit from class
              signature: buildMethodSignature(member, sourceFile),
            });
          }
        }
      }

      // Interface declarations
      if (ts.isInterfaceDeclaration(node)) {
        symbols.push({
          name: node.name.text,
          kind: 'interface',
          exported: hasExportModifier(node),
        });
      }

      // Type alias declarations
      if (ts.isTypeAliasDeclaration(node)) {
        symbols.push({
          name: node.name.text,
          kind: 'type',
          exported: hasExportModifier(node),
        });
      }

      // Enum declarations
      if (ts.isEnumDeclaration(node)) {
        symbols.push({
          name: node.name.text,
          kind: 'enum',
          exported: hasExportModifier(node),
        });
      }

      // Variable declarations (const/let/var with arrow functions or values)
      if (ts.isVariableStatement(node)) {
        const isExported = hasExportModifier(node);
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const init = decl.initializer;
            if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
              symbols.push({
                name: decl.name.text,
                kind: 'function',
                exported: isExported,
                signature: buildArrowSignature(decl.name.text, init, sourceFile),
              });
            } else if (isExported) {
              symbols.push({
                name: decl.name.text,
                kind: 'variable',
                exported: true,
              });
            }
          }
        }
      }

      // Import declarations
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const from = moduleSpecifier.text;
          const importClause = node.importClause;
          if (importClause) {
            // Default import
            if (importClause.name) {
              imports.push({ name: importClause.name.text, from });
            }
            // Named imports
            if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
              for (const element of importClause.namedBindings.elements) {
                imports.push({ name: element.name.text, from });
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { filePath, symbols, imports };
  }

  /**
   * Extract symbols from multiple files (capped at maxFiles).
   */
  async extractFiles(filePaths: string[], maxFiles = 30): Promise<FileSymbols[]> {
    const capped = filePaths.slice(0, maxFiles);
    const results: FileSymbols[] = [];

    for (const filePath of capped) {
      const result = await this.extractFile(filePath);
      if (result && result.symbols.length > 0) {
        results.push(result);
      }
    }

    log(`Extracted symbols from ${results.length}/${capped.length} files`);
    return results;
  }
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function buildFunctionSignature(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
): string {
  const name = node.name?.text ?? 'anonymous';
  const params = node.parameters
    .map((p) => p.getText(sourceFile))
    .join(', ');
  const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
  return `function ${name}(${params})${returnType}`;
}

function buildMethodSignature(
  node: ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
): string {
  const name = node.name.getText(sourceFile);
  const params = node.parameters
    .map((p) => p.getText(sourceFile))
    .join(', ');
  const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
  return `${name}(${params})${returnType}`;
}

function buildArrowSignature(
  name: string,
  node: ts.ArrowFunction | ts.FunctionExpression,
  sourceFile: ts.SourceFile,
): string {
  const params = node.parameters
    .map((p) => p.getText(sourceFile))
    .join(', ');
  const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
  return `const ${name} = (${params})${returnType}`;
}
