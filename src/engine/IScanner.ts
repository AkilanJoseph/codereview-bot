import type { Finding, PrFile } from './types';

export interface IScanner {
  analyze(files: PrFile[]): Finding[];
}
