import type { IScanner } from '../../IScanner';
import type { Finding, PrFile } from '../../types';

// Detects SQL queries built via string concatenation — a common injection vector.
// Looks for SQL keywords immediately followed by string + variable concatenation.
const SQL_CONCAT_PATTERN =
  /(['"`])\s*(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE)\b[^'"`]*\1\s*\+/gi;

// Detects template literals embedding SQL keywords with interpolated expressions.
const SQL_TEMPLATE_PATTERN =
  /`[^`]*(SELECT|INSERT|UPDATE|DELETE|DROP)\b[^`]*\$\{/gi;

export class SqlInjectionRule implements IScanner {
  analyze(files: PrFile[]): Finding[] {
    const findings: Finding[] = [];

    for (const file of files) {
      if (!isCodeFile(file.filePath)) continue;

      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';

        if (SQL_CONCAT_PATTERN.test(line)) {
          SQL_CONCAT_PATTERN.lastIndex = 0;
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'CRITICAL',
            ruleSlug: 'sql-injection',
            message: `SQL query built via string concatenation at line ${i + 1} — user-controlled input may reach the query.`,
            suggestion:
              'Use parameterized queries or a query builder (e.g., Prisma). Never concatenate user input into SQL strings.',
          });
        }
        SQL_CONCAT_PATTERN.lastIndex = 0;

        if (SQL_TEMPLATE_PATTERN.test(line)) {
          SQL_TEMPLATE_PATTERN.lastIndex = 0;
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'CRITICAL',
            ruleSlug: 'sql-injection',
            message: `SQL query uses template literal interpolation at line ${i + 1} — interpolated values are not parameterized.`,
            suggestion:
              'Replace template literal SQL with parameterized query placeholders ($1, $2, ...) or use an ORM.',
          });
        }
        SQL_TEMPLATE_PATTERN.lastIndex = 0;
      }
    }

    return findings;
  }
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|py|java|go|rb|php|cs)$/.test(filePath);
}
