import type { IScanner } from './IScanner';
import type { Finding, PrFile } from './types';
import { FindingAggregator } from './FindingAggregator';
import { SqlInjectionRule } from './scanners/security/SqlInjectionRule';
import { XssRule } from './scanners/security/XssRule';
import { HardcodedSecretsRule } from './scanners/security/HardcodedSecretsRule';
import { NPlusOneRule } from './scanners/performance/NPlusOneRule';
import { SynchronousIoRule } from './scanners/performance/SynchronousIoRule';
import { CyclomaticComplexityRule } from './scanners/style/CyclomaticComplexityRule';
import { NamingConventionRule } from './scanners/style/NamingConventionRule';

export class AnalysisEngine {
  private readonly scanners: IScanner[];
  private readonly aggregator: FindingAggregator;

  constructor(scanners?: IScanner[]) {
    this.scanners = scanners ?? [
      new SqlInjectionRule(),
      new XssRule(),
      new HardcodedSecretsRule(),
      new NPlusOneRule(),
      new SynchronousIoRule(),
      new CyclomaticComplexityRule(),
      new NamingConventionRule(),
    ];
    this.aggregator = new FindingAggregator();
  }

  async analyze(files: PrFile[]): Promise<Finding[]> {
    // Run all scanners concurrently — each scanner is CPU-bound/synchronous
    // but wrapping in Promise.all keeps the pattern extensible for async scanners.
    const results = await Promise.all(
      this.scanners.map((scanner) =>
        Promise.resolve(scanner.analyze(files)),
      ),
    );
    const raw = results.flat();
    return this.aggregator.aggregate(raw);
  }
}
