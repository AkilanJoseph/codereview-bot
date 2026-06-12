import type { Finding } from './types';

export class FindingAggregator {
  dedupe(findings: Finding[]): Finding[] {
    const seen = new Set<string>();
    return findings.filter((f) => {
      const key = `${f.ruleSlug}|${f.filePath}|${f.lineStart}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  sortBySeverity(findings: Finding[]): Finding[] {
    const order: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
      INFO: 4,
    };
    return [...findings].sort(
      (a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5),
    );
  }

  aggregate(rawFindings: Finding[]): Finding[] {
    const deduped = this.dedupe(rawFindings);
    return this.sortBySeverity(deduped);
  }
}
