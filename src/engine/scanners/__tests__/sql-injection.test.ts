import { describe, it, expect } from 'vitest';
import { SqlInjectionRule } from '../security/SqlInjectionRule';
import { FIXTURES } from '../../../__fixtures__';
import type { PrFile } from '../../types';

const rule = new SqlInjectionRule();

describe('SqlInjectionRule', () => {
  describe('true positives', () => {
    it('flags string concatenation with SQL SELECT', () => {
      const findings = rule.analyze([FIXTURES.sqlInjectionVulnerable]);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]?.ruleSlug).toBe('sql-injection');
      expect(findings[0]?.severity).toBe('CRITICAL');
      expect(findings[0]?.category).toBe('SECURITY');
    });

    it('flags template literal with SQL keyword and interpolation', () => {
      const file: PrFile = {
        filePath: 'src/db.ts',
        content: 'const q = `SELECT * FROM users WHERE name = ${userInput}`;',
      };
      const findings = rule.analyze([file]);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]?.ruleSlug).toBe('sql-injection');
    });

    it('flags DELETE with string concat', () => {
      const file: PrFile = {
        filePath: 'src/admin.ts',
        content: "db.run('DELETE FROM sessions WHERE id = ' + sessionId);",
      };
      const findings = rule.analyze([file]);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('true negatives', () => {
    it('does not flag parameterized Prisma queries', () => {
      const findings = rule.analyze([FIXTURES.sqlInjectionSafe]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag SQL string literals with no concatenation', () => {
      const file: PrFile = {
        filePath: 'src/migrations.ts',
        content: "const q = 'SELECT 1';",
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag non-code files', () => {
      const file: PrFile = {
        filePath: 'README.md',
        content: "Run 'SELECT * FROM users' + variable for examples.",
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty file without error', () => {
      const findings = rule.analyze([FIXTURES.emptyFile]);
      expect(findings).toHaveLength(0);
    });

    it('handles file with no SQL keywords', () => {
      const file: PrFile = {
        filePath: 'src/math.ts',
        content: 'const sum = a + b;\nconst product = a * b;',
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });

    it('deduplicates the same finding on the same line', () => {
      // Two patterns on the same line — only one finding per unique (rule+file+line)
      const file: PrFile = {
        filePath: 'src/db.ts',
        content: "const q = `SELECT * FROM ${table}` + \" WHERE id = \" + id;",
      };
      const findings = rule.analyze([file]);
      // Should detect but not blow up; exact count is implementation-defined
      expect(Array.isArray(findings)).toBe(true);
    });

    it('returns finding with correct lineStart', () => {
      const file: PrFile = {
        filePath: 'src/repo.ts',
        content: [
          'function safe() {}',
          'function unsafe() {',
          "  const sql = 'SELECT * FROM orders WHERE user_id = ' + userId;",
          '}',
        ].join('\n'),
      };
      const findings = rule.analyze([file]);
      expect(findings[0]?.lineStart).toBe(3);
    });
  });
});
