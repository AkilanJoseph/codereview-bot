export interface PrFile {
  filePath: string;
  content: string;
  patch?: string;
}

export type Category = 'SECURITY' | 'PERFORMANCE' | 'STYLE';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Finding {
  filePath: string;
  lineStart: number;
  lineEnd?: number;
  category: Category;
  severity: Severity;
  ruleSlug: string;
  message: string;
  suggestion: string;
}
