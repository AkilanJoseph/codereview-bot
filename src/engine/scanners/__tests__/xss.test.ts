import { describe, it, expect } from 'vitest';
import { XssRule } from '../security/XssRule';

const rule = new XssRule();

describe('XssRule', () => {
  describe('true positives', () => {
    it('flags innerHTML assignment with variable', () => {
      const findings = rule.analyze([{ filePath: 'src/ui.ts', content: 'el.innerHTML = userInput;' }]);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleSlug).toBe('xss');
      expect(findings[0]?.severity).toBe('HIGH');
    });

    it('flags outerHTML assignment with variable', () => {
      const findings = rule.analyze([{ filePath: 'src/ui.js', content: 'div.outerHTML = data;' }]);
      expect(findings).toHaveLength(1);
    });

    it('flags document.write with dynamic content', () => {
      const findings = rule.analyze([{ filePath: 'src/page.js', content: 'document.write(userHtml);' }]);
      expect(findings).toHaveLength(1);
    });

    it('flags document.writeln with dynamic content', () => {
      const findings = rule.analyze([{ filePath: 'src/page.js', content: 'document.writeln(value);' }]);
      expect(findings).toHaveLength(1);
    });

    it('flags dangerouslySetInnerHTML with variable', () => {
      const findings = rule.analyze([{ filePath: 'src/App.tsx', content: '<div dangerouslySetInnerHTML={userContent} />' }]);
      expect(findings).toHaveLength(1);
    });
  });

  describe('true negatives', () => {
    it('does not flag innerHTML with double-quoted string literal', () => {
      const findings = rule.analyze([{ filePath: 'src/ui.ts', content: 'el.innerHTML = "Hello World";' }]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag textContent assignment', () => {
      const findings = rule.analyze([{ filePath: 'src/ui.ts', content: 'el.textContent = userInput;' }]);
      expect(findings).toHaveLength(0);
    });

    it('does not scan non-web files', () => {
      const findings = rule.analyze([{ filePath: 'src/util.py', content: 'el.innerHTML = userInput;' }]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag dangerouslySetInnerHTML with string literal __html', () => {
      const findings = rule.analyze([{ filePath: 'src/App.tsx', content: "dangerouslySetInnerHTML={{ __html: '<b>ok</b>' }}" }]);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty file', () => {
      expect(rule.analyze([{ filePath: 'src/ui.ts', content: '' }])).toHaveLength(0);
    });

    it('handles empty file list', () => {
      expect(rule.analyze([])).toHaveLength(0);
    });
  });
});
