import type { IScanner } from '../../IScanner';
import type { Finding, PrFile } from '../../types';

// innerHTML / outerHTML assigned a non-literal value (variable or expression).
const INNER_HTML_PATTERN = /\.(?:inner|outer)HTML\s*=\s*(?!['"`])/g;

// document.write with a non-literal argument.
const DOC_WRITE_PATTERN = /document\.write(?:ln)?\s*\(\s*(?!['"`])/g;

// React dangerouslySetInnerHTML used with a variable (not a string literal object).
const DANGEROUS_HTML_PATTERN = /dangerouslySetInnerHTML\s*=\s*\{(?!\s*\{\s*__html\s*:\s*['"`])/g;

export class XssRule implements IScanner {
  analyze(files: PrFile[]): Finding[] {
    const findings: Finding[] = [];

    for (const file of files) {
      if (!isWebFile(file.filePath)) continue;

      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';

        if (INNER_HTML_PATTERN.test(line)) {
          INNER_HTML_PATTERN.lastIndex = 0;
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'HIGH',
            ruleSlug: 'xss',
            message: `Unescaped assignment to innerHTML/outerHTML at line ${i + 1} — may allow XSS if value contains user input.`,
            suggestion:
              'Use textContent for plain text, or sanitize HTML with DOMPurify before assigning to innerHTML.',
          });
        }
        INNER_HTML_PATTERN.lastIndex = 0;

        if (DOC_WRITE_PATTERN.test(line)) {
          DOC_WRITE_PATTERN.lastIndex = 0;
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'HIGH',
            ruleSlug: 'xss',
            message: `document.write() with dynamic content at line ${i + 1} — can inject arbitrary HTML.`,
            suggestion:
              'Replace document.write() with DOM manipulation (createElement, appendChild) or template literals with sanitized values.',
          });
        }
        DOC_WRITE_PATTERN.lastIndex = 0;

        if (DANGEROUS_HTML_PATTERN.test(line)) {
          DANGEROUS_HTML_PATTERN.lastIndex = 0;
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'HIGH',
            ruleSlug: 'xss',
            message: `dangerouslySetInnerHTML with dynamic value at line ${i + 1} — bypasses React's XSS protections.`,
            suggestion:
              'Sanitize the HTML string with DOMPurify before passing to dangerouslySetInnerHTML, or restructure to avoid raw HTML.',
          });
        }
        DANGEROUS_HTML_PATTERN.lastIndex = 0;
      }
    }

    return findings;
  }
}

function isWebFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|html|vue|svelte)$/.test(filePath);
}
