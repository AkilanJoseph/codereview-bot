import type { IScanner } from '../../IScanner';
import type { Finding, PrFile } from '../../types';

// Matches loop constructs (for, for...of, for...in, while, forEach, map, etc.)
const LOOP_START =
  /\b(?:for\s*\(|for\s+(?:const|let|var)\s+\w+\s+(?:of|in)|while\s*\(|\.(?:forEach|map|filter|reduce|flatMap)\s*\()/;

// Matches awaited DB/ORM calls inside a loop body.
const DB_CALL =
  /await\s+(?:prisma\.|db\.|repository\.|knex\(|pool\.query\(|connection\.query\(|sequelize\.|mongoose\.\w+\.find)/;

export class NPlusOneRule implements IScanner {
  analyze(files: PrFile[]): Finding[] {
    const findings: Finding[] = [];

    for (const file of files) {
      if (!isCodeFile(file.filePath)) continue;

      const lines = file.content.split('\n');
      let loopDepth = 0;
      let loopStartLine = 0;
      let braceCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';

        if (LOOP_START.test(line)) {
          loopDepth++;
          if (loopDepth === 1) {
            loopStartLine = i + 1;
            braceCount = 0;
          }
        }

        if (loopDepth > 0) {
          braceCount += (line.match(/\{/g) ?? []).length;
          braceCount -= (line.match(/\}/g) ?? []).length;

          if (DB_CALL.test(line)) {
            findings.push({
              filePath: file.filePath,
              lineStart: i + 1,
              category: 'PERFORMANCE',
              severity: 'HIGH',
              ruleSlug: 'n-plus-one',
              message: `Database query inside a loop starting near line ${loopStartLine} — may cause N+1 query pattern.`,
              suggestion:
                'Collect IDs from the loop, then use a single query with WHERE IN / findMany. Use eager loading or batch fetching instead.',
            });
          }

          if (braceCount <= 0 && loopDepth > 0) {
            loopDepth = Math.max(0, loopDepth - 1);
          }
        }
      }
    }

    return findings;
  }
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}
