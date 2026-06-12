import { describe, it, expect } from 'vitest';
import { CyclomaticComplexityRule } from '../style/CyclomaticComplexityRule';

const rule = new CyclomaticComplexityRule();

function makeComplexFunction(ifCount: number): string {
  const body = Array.from({ length: ifCount }, (_, i) => `  if (x === ${i}) { return ${i}; }`).join('\n');
  return `function complex(x) {\n${body}\n  return -1;\n}`;
}

describe('CyclomaticComplexityRule', () => {
  describe('true positives', () => {
    it('flags function exceeding default threshold (10)', () => {
      const content = makeComplexFunction(11);
      const findings = rule.analyze([{ filePath: 'src/util.ts', content }]);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleSlug).toBe('cyclomatic-complexity');
      expect(findings[0]?.severity).toBe('MEDIUM');
    });

    it('flags arrow function with high complexity', () => {
      const body = Array.from({ length: 12 }, (_, i) => `if (n === ${i}) return ${i};`).join(' ');
      const content = `const fn = (n) => { ${body} return -1; };`;
      const findings = rule.analyze([{ filePath: 'src/fn.ts', content }]);
      expect(findings).toHaveLength(1);
    });
  });

  describe('true negatives', () => {
    it('does not flag simple function', () => {
      const content = 'function simple(x) { return x + 1; }';
      const findings = rule.analyze([{ filePath: 'src/util.ts', content }]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag function with exactly threshold conditions', () => {
      const content = makeComplexFunction(9);
      const findings = rule.analyze([{ filePath: 'src/util.ts', content }]);
      expect(findings).toHaveLength(0);
    });

    it('does not scan non-code files', () => {
      const content = makeComplexFunction(15);
      const findings = rule.analyze([{ filePath: 'README.md', content }]);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      expect(rule.analyze([{ filePath: 'src/a.ts', content: '' }])).toHaveLength(0);
    });

    it('handles empty list', () => {
      expect(rule.analyze([])).toHaveLength(0);
    });
  });
});
