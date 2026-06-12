import { describe, it, expect } from 'vitest';
import { NPlusOneRule } from '../performance/NPlusOneRule';

const rule = new NPlusOneRule();

describe('NPlusOneRule', () => {
  describe('true positives', () => {
    it('flags await prisma call inside for loop', () => {
      const content = [
        'for (const id of ids) {',
        '  const user = await prisma.user.findUnique({ where: { id } });',
        '}',
      ].join('\n');
      const findings = rule.analyze([{ filePath: 'src/service.ts', content }]);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleSlug).toBe('n-plus-one');
      expect(findings[0]?.severity).toBe('HIGH');
    });

    it('flags await db call inside while loop', () => {
      const content = [
        'while (cursor.hasNext()) {',
        '  const row = await db.query("SELECT * FROM users");',
        '}',
      ].join('\n');
      const findings = rule.analyze([{ filePath: 'src/repo.ts', content }]);
      expect(findings).toHaveLength(1);
    });

    it('flags await prisma inside forEach callback', () => {
      const content = 'items.forEach(async (item) => { await prisma.order.create({ data: item }); });';
      const findings = rule.analyze([{ filePath: 'src/batch.ts', content }]);
      expect(findings).toHaveLength(1);
    });
  });

  describe('true negatives', () => {
    it('does not flag prisma call outside a loop', () => {
      const content = 'const users = await prisma.user.findMany();';
      const findings = rule.analyze([{ filePath: 'src/service.ts', content }]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag non-awaited calls inside loop', () => {
      const content = [
        'for (const item of items) {',
        '  console.log(item.id);',
        '}',
      ].join('\n');
      const findings = rule.analyze([{ filePath: 'src/util.ts', content }]);
      expect(findings).toHaveLength(0);
    });

    it('does not scan non-code files', () => {
      const content = 'for (const id of ids) { await prisma.user.findUnique({ where: { id } }); }';
      const findings = rule.analyze([{ filePath: 'README.md', content }]);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      expect(rule.analyze([{ filePath: 'src/a.ts', content: '' }])).toHaveLength(0);
    });
  });
});
