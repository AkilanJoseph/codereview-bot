import type { IScanner } from '../../IScanner';
import type { Finding, PrFile } from '../../types';

const COMPLEXITY_THRESHOLD = 10;
const FUNCTION_START = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>))/;
// Each of these adds 1 to cyclomatic complexity.
const COMPLEXITY_INCREMENT = /\b(?:if|else if|for|while|do|case|catch|&&|\|\||\?\s)/g;

export class CyclomaticComplexityRule implements IScanner {
  analyze(files: PrFile[]): Finding[] {
    const findings: Finding[] = [];

    for (const file of files) {
      if (!isCodeFile(file.filePath)) continue;

      const lines = file.content.split('\n');
      let fnName = '';
      let fnStartLine = 0;
      let braceDepth = 0;
      let fnBraceDepth = -1;
      let complexity = 0;
      let inFunction = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';

        const fnMatch = FUNCTION_START.exec(line);
        if (fnMatch && !inFunction) {
          fnName = fnMatch[1] ?? fnMatch[2] ?? '<anonymous>';
          fnStartLine = i + 1;
          fnBraceDepth = braceDepth;
          complexity = 1;
          inFunction = true;
        }

        if (inFunction) {
          COMPLEXITY_INCREMENT.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = COMPLEXITY_INCREMENT.exec(line)) !== null) {
            complexity++;
            void m;
          }
        }

        braceDepth += (line.match(/\{/g) ?? []).length;
        braceDepth -= (line.match(/\}/g) ?? []).length;

        if (inFunction && braceDepth <= fnBraceDepth) {
          if (complexity > COMPLEXITY_THRESHOLD) {
            findings.push({
              filePath: file.filePath,
              lineStart: fnStartLine,
              lineEnd: i + 1,
              category: 'STYLE',
              severity: 'MEDIUM',
              ruleSlug: 'cyclomatic-complexity',
              message: `Function '${fnName}' has cyclomatic complexity of ${complexity} (threshold: ${COMPLEXITY_THRESHOLD}).`,
              suggestion: `Break '${fnName}' into smaller functions. Extract conditional branches, early-return to reduce nesting, or use a strategy pattern for the branching logic.`,
            });
          }
          inFunction = false;
          complexity = 0;
          fnName = '';
        }
      }
    }

    return findings;
  }
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}
