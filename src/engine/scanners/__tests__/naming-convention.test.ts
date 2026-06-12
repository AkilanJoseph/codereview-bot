import { describe, it, expect } from 'vitest';
import { NamingConventionRule } from '../style/NamingConventionRule';

const rule = new NamingConventionRule();

describe('NamingConventionRule', () => {
  describe('true positives', () => {
    it('flags snake_case variable with const', () => {
      const findings = rule.analyze([{ filePath: 'src/util.ts', content: 'const user_name = "alice";' }]);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleSlug).toBe('naming-convention');
      expect(findings[0]?.suggestion).toContain('userName');
    });

    it('flags snake_case variable with let', () => {
      const findings = rule.analyze([{ filePath: 'src/util.ts', content: 'let user_count = 0;' }]);
      expect(findings).toHaveLength(1);
    });

    it('flags lowercase class name', () => {
      const findings = rule.analyze([{ filePath: 'src/util.ts', content: 'class myService {}' }]);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.suggestion).toContain('MyService');
    });
  });

  describe('true negatives', () => {
    it('does not flag camelCase variable', () => {
      const findings = rule.analyze([{ filePath: 'src/util.ts', content: 'const userName = "alice";' }]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag PascalCase class', () => {
      const findings = rule.analyze([{ filePath: 'src/util.ts', content: 'class UserService {}' }]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag comments containing snake_case', () => {
      const findings = rule.analyze([{ filePath: 'src/util.ts', content: '// const user_name — old variable' }]);
      expect(findings).toHaveLength(0);
    });

    it('does not scan non-code files', () => {
      const findings = rule.analyze([{ filePath: 'data.json', content: 'const user_name = "x";' }]);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty file', () => {
      expect(rule.analyze([{ filePath: 'src/a.ts', content: '' }])).toHaveLength(0);
    });

    it('handles multiple violations on the same line', () => {
      const findings = rule.analyze([{ filePath: 'src/a.ts', content: 'const first_name = "a"; const last_name = "b";' }]);
      expect(findings.length).toBeGreaterThanOrEqual(2);
    });
  });
});
