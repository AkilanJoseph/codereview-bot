import { describe, it, expect } from 'vitest';
import { SynchronousIoRule } from '../performance/SynchronousIoRule';

const rule = new SynchronousIoRule();

describe('SynchronousIoRule', () => {
  describe('true positives', () => {
    it('flags fs.readFileSync', () => {
      const findings = rule.analyze([{ filePath: 'src/loader.ts', content: 'const data = fs.readFileSync("file.txt");' }]);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleSlug).toBe('synchronous-io');
      expect(findings[0]?.severity).toBe('MEDIUM');
    });

    it('flags fs.writeFileSync', () => {
      const findings = rule.analyze([{ filePath: 'src/writer.ts', content: 'fs.writeFileSync("out.txt", content);' }]);
      expect(findings).toHaveLength(1);
    });

    it('flags fs.existsSync', () => {
      const findings = rule.analyze([{ filePath: 'src/check.ts', content: 'if (fs.existsSync(path)) {' }]);
      expect(findings).toHaveLength(1);
    });
  });

  describe('true negatives', () => {
    it('does not flag fs.readFile (async)', () => {
      const findings = rule.analyze([{ filePath: 'src/loader.ts', content: 'await fs.promises.readFile("file.txt");' }]);
      expect(findings).toHaveLength(0);
    });

    it('does not scan non-code files', () => {
      const findings = rule.analyze([{ filePath: 'config.yaml', content: 'fs.readFileSync("x")' }]);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty file', () => {
      expect(rule.analyze([{ filePath: 'src/a.ts', content: '' }])).toHaveLength(0);
    });

    it('handles empty list', () => {
      expect(rule.analyze([])).toHaveLength(0);
    });
  });
});
