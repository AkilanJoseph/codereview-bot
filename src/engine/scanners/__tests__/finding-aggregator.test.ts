import { describe, it, expect } from 'vitest';
import { FindingAggregator } from '../../FindingAggregator';
import type { Finding } from '../../types';

const aggregator = new FindingAggregator();

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  filePath: 'src/foo.ts',
  lineStart: 1,
  category: 'SECURITY',
  severity: 'HIGH',
  ruleSlug: 'test-rule',
  message: 'Test finding',
  suggestion: 'Fix it',
  ...overrides,
});

describe('FindingAggregator', () => {
  describe('dedupe', () => {
    it('removes exact duplicates (same rule + file + line)', () => {
      const findings = [makeFinding(), makeFinding()];
      expect(aggregator.dedupe(findings)).toHaveLength(1);
    });

    it('keeps findings that differ by line', () => {
      const findings = [makeFinding({ lineStart: 1 }), makeFinding({ lineStart: 2 })];
      expect(aggregator.dedupe(findings)).toHaveLength(2);
    });

    it('keeps findings that differ by rule', () => {
      const findings = [makeFinding({ ruleSlug: 'rule-a' }), makeFinding({ ruleSlug: 'rule-b' })];
      expect(aggregator.dedupe(findings)).toHaveLength(2);
    });
  });

  describe('sortBySeverity', () => {
    it('orders CRITICAL before HIGH before MEDIUM', () => {
      const findings = [
        makeFinding({ severity: 'MEDIUM' }),
        makeFinding({ lineStart: 2, severity: 'CRITICAL' }),
        makeFinding({ lineStart: 3, severity: 'HIGH' }),
      ];
      const sorted = aggregator.sortBySeverity(findings);
      expect(sorted[0]?.severity).toBe('CRITICAL');
      expect(sorted[1]?.severity).toBe('HIGH');
      expect(sorted[2]?.severity).toBe('MEDIUM');
    });
  });

  describe('aggregate', () => {
    it('deduplicates and sorts in one call', () => {
      const findings = [
        makeFinding({ severity: 'LOW', lineStart: 5 }),
        makeFinding({ severity: 'LOW', lineStart: 5 }), // duplicate
        makeFinding({ severity: 'CRITICAL', lineStart: 10, ruleSlug: 'other' }),
      ];
      const result = aggregator.aggregate(findings);
      expect(result).toHaveLength(2);
      expect(result[0]?.severity).toBe('CRITICAL');
    });
  });
});
