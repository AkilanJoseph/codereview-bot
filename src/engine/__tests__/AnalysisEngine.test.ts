import { describe, it, expect, vi } from 'vitest';
import { AnalysisEngine } from '../AnalysisEngine';
import type { IScanner } from '../IScanner';
import type { Finding, PrFile } from '../types';

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  filePath: 'src/foo.ts',
  lineStart: 1,
  category: 'SECURITY',
  severity: 'HIGH',
  ruleSlug: 'test-rule',
  message: 'test',
  suggestion: 'fix it',
  ...overrides,
});

const cleanFile: PrFile = { filePath: 'src/clean.ts', content: 'const x = 1;' };
const sqlFile: PrFile = { filePath: 'src/db.ts', content: '`SELECT * FROM users WHERE id = ${userId}`' };

describe('AnalysisEngine', () => {
  it('returns empty array when no files are provided', async () => {
    const engine = new AnalysisEngine();
    const findings = await engine.analyze([]);
    expect(findings).toHaveLength(0);
  });

  it('aggregates findings from all scanners', async () => {
    const mockScannerA: IScanner = {
      analyze: vi.fn().mockReturnValue([makeFinding({ ruleSlug: 'rule-a', lineStart: 1 })]),
    };
    const mockScannerB: IScanner = {
      analyze: vi.fn().mockReturnValue([makeFinding({ ruleSlug: 'rule-b', lineStart: 2 })]),
    };

    const engine = new AnalysisEngine([mockScannerA, mockScannerB]);
    const findings = await engine.analyze([cleanFile]);

    expect(findings).toHaveLength(2);
    expect(mockScannerA.analyze).toHaveBeenCalledWith([cleanFile]);
    expect(mockScannerB.analyze).toHaveBeenCalledWith([cleanFile]);
  });

  it('deduplicates findings from multiple scanners', async () => {
    const dupe = makeFinding({ ruleSlug: 'rule-x', lineStart: 5 });
    const mockScannerA: IScanner = { analyze: vi.fn().mockReturnValue([dupe]) };
    const mockScannerB: IScanner = { analyze: vi.fn().mockReturnValue([dupe]) };

    const engine = new AnalysisEngine([mockScannerA, mockScannerB]);
    const findings = await engine.analyze([cleanFile]);

    expect(findings).toHaveLength(1);
  });

  it('sorts findings by severity (CRITICAL before HIGH)', async () => {
    const mockScanner: IScanner = {
      analyze: vi.fn().mockReturnValue([
        makeFinding({ severity: 'HIGH', lineStart: 1, ruleSlug: 'r1' }),
        makeFinding({ severity: 'CRITICAL', lineStart: 2, ruleSlug: 'r2' }),
      ]),
    };

    const engine = new AnalysisEngine([mockScanner]);
    const findings = await engine.analyze([cleanFile]);

    expect(findings[0]?.severity).toBe('CRITICAL');
    expect(findings[1]?.severity).toBe('HIGH');
  });

  it('detects SQL injection in real code using default scanners', async () => {
    const engine = new AnalysisEngine();
    const findings = await engine.analyze([sqlFile]);

    expect(findings.some((f) => f.ruleSlug === 'sql-injection')).toBe(true);
  });

  it('returns empty array for clean files', async () => {
    const engine = new AnalysisEngine();
    const findings = await engine.analyze([cleanFile]);
    expect(findings).toHaveLength(0);
  });

  it('handles scanner that returns no findings', async () => {
    const emptyScanner: IScanner = { analyze: vi.fn().mockReturnValue([]) };
    const engine = new AnalysisEngine([emptyScanner]);
    const findings = await engine.analyze([cleanFile]);
    expect(findings).toHaveLength(0);
  });
});
