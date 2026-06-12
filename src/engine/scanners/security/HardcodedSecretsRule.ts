import type { IScanner } from '../../IScanner';
import type { Finding, PrFile } from '../../types';

// AWS access key IDs always start with AKIA followed by 16 uppercase alphanumerics.
const AWS_ACCESS_KEY = /\bAKIA[0-9A-Z]{16}\b/g;

// PEM private key blocks embedded directly in source.
const PEM_PRIVATE_KEY = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g;

// Variables whose names suggest secrets, assigned a string literal of 8+ chars.
// Excludes process.env reads and empty/placeholder strings.
const GENERIC_SECRET =
  /(?:password|passwd|secret|token|api[_\-.]?key|auth[_\-.]?key|access[_\-.]?key)\s*[=:]\s*['"`]([^'"`\s]{8,})['"`]/gi;

// Placeholder values that are clearly not real secrets (skip these).
const PLACEHOLDER_PATTERN =
  /^(your[-_]?.+|placeholder|changeme|example|todo|xxx+|<.+>|\*+|test|dummy|fake)$/i;

export class HardcodedSecretsRule implements IScanner {
  analyze(files: PrFile[]): Finding[] {
    const findings: Finding[] = [];

    for (const file of files) {
      if (!isCodeOrConfigFile(file.filePath)) continue;
      // Never flag the .env.example — it's meant to have placeholder values.
      if (file.filePath.endsWith('.env.example')) continue;

      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';

        // Skip lines that read from environment variables — not a hardcoded secret.
        if (/process\.env/.test(line)) continue;

        if (AWS_ACCESS_KEY.test(line)) {
          AWS_ACCESS_KEY.lastIndex = 0;
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'CRITICAL',
            ruleSlug: 'hardcoded-secrets',
            message: `AWS access key ID found at line ${i + 1} — credential hardcoded in source.`,
            suggestion:
              'Remove the key from source and load it via process.env.AWS_ACCESS_KEY_ID from a secrets manager or .env file that is gitignored.',
          });
        }
        AWS_ACCESS_KEY.lastIndex = 0;

        if (PEM_PRIVATE_KEY.test(line)) {
          PEM_PRIVATE_KEY.lastIndex = 0;
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'CRITICAL',
            ruleSlug: 'hardcoded-secrets',
            message: `Private key PEM block found at line ${i + 1} — private key hardcoded in source.`,
            suggestion:
              'Store the private key in an environment variable or secrets manager. Never commit private keys to version control.',
          });
        }
        PEM_PRIVATE_KEY.lastIndex = 0;

        let match: RegExpExecArray | null;
        GENERIC_SECRET.lastIndex = 0;
        while ((match = GENERIC_SECRET.exec(line)) !== null) {
          const value = match[1] ?? '';
          if (PLACEHOLDER_PATTERN.test(value)) continue;

          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'SECURITY',
            severity: 'CRITICAL',
            ruleSlug: 'hardcoded-secrets',
            message: `Potential hardcoded secret in variable at line ${i + 1} — value matches high-entropy credential pattern.`,
            suggestion:
              'Move the value to an environment variable and access it via process.env. Add the .env file to .gitignore.',
          });
          break; // One finding per line is sufficient
        }
        GENERIC_SECRET.lastIndex = 0;
      }
    }

    return findings;
  }
}

function isCodeOrConfigFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|py|java|go|rb|php|cs|yaml|yml|json|env)$/.test(filePath);
}
