import type { IScanner } from '../../IScanner';
import type { Finding, PrFile } from '../../types';

// Variable/const/let declarations using snake_case (underscore between lowercase letters).
const SNAKE_CASE_VAR = /\b(?:const|let|var)\s+([a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+)\b/g;

// Class declarations not using PascalCase.
const NON_PASCAL_CLASS = /\bclass\s+([a-z][a-zA-Z0-9]*)\b/g;

export class NamingConventionRule implements IScanner {
  analyze(files: PrFile[]): Finding[] {
    const findings: Finding[] = [];

    for (const file of files) {
      if (!isCodeFile(file.filePath)) continue;

      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';

        // Skip comments
        if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) continue;

        SNAKE_CASE_VAR.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = SNAKE_CASE_VAR.exec(line)) !== null) {
          const name = match[1] ?? '';
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'STYLE',
            severity: 'LOW',
            ruleSlug: 'naming-convention',
            message: `Variable '${name}' uses snake_case — JavaScript/TypeScript convention is camelCase.`,
            suggestion: `Rename '${name}' to '${snakeToCamel(name)}'.`,
          });
        }

        NON_PASCAL_CLASS.lastIndex = 0;
        while ((match = NON_PASCAL_CLASS.exec(line)) !== null) {
          const name = match[1] ?? '';
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'STYLE',
            severity: 'LOW',
            ruleSlug: 'naming-convention',
            message: `Class '${name}' does not use PascalCase — class names must start with an uppercase letter.`,
            suggestion: `Rename '${name}' to '${toPascalCase(name)}'.`,
          });
        }
      }
    }

    return findings;
  }
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toPascalCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}
