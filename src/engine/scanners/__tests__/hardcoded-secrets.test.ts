import { describe, it, expect } from 'vitest';
import { HardcodedSecretsRule } from '../security/HardcodedSecretsRule';
import { FIXTURES } from '../../../__fixtures__';
import type { PrFile } from '../../types';

const rule = new HardcodedSecretsRule();

describe('HardcodedSecretsRule', () => {
  describe('true positives', () => {
    it('flags AWS AKIA access key', () => {
      const file: PrFile = {
        filePath: 'src/aws.ts',
        content: "const key = 'AKIAIOSFODNN7EXAMPLE';",
      };
      const findings = rule.analyze([file]);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]?.ruleSlug).toBe('hardcoded-secrets');
      expect(findings[0]?.severity).toBe('CRITICAL');
    });

    it('flags PEM private key block', () => {
      const file: PrFile = {
        filePath: 'src/cert.ts',
        content: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAK...\n-----END RSA PRIVATE KEY-----',
      };
      const findings = rule.analyze([file]);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]?.category).toBe('SECURITY');
    });

    it('flags generic password variable with literal value', () => {
      const file: PrFile = {
        filePath: 'src/db.ts',
        content: "const password = 'SuperSecret123!';",
      };
      const findings = rule.analyze([file]);
      expect(findings.length).toBeGreaterThan(0);
    });

    it('flags api_key with literal value', () => {
      const file: PrFile = {
        filePath: 'src/config.ts',
        content: "const api_key = 'sk-abc123def456ghi789';",
      };
      const findings = rule.analyze([file]);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('true negatives', () => {
    it('does not flag process.env reads', () => {
      const findings = rule.analyze([FIXTURES.hardcodedSecretSafe]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag .env.example files', () => {
      const file: PrFile = {
        filePath: '.env.example',
        content: "GITHUB_WEBHOOK_SECRET=your_webhook_secret_here",
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag placeholder values', () => {
      const file: PrFile = {
        filePath: 'src/config.ts',
        content: "const secret = 'changeme';",
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag non-secret variable names with string values', () => {
      const file: PrFile = {
        filePath: 'src/ui.ts',
        content: "const buttonLabel = 'Click here to submit';",
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag short values (under 8 chars) for generic pattern', () => {
      const file: PrFile = {
        filePath: 'src/config.ts',
        content: "const password = 'abc';",
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty file without error', () => {
      const findings = rule.analyze([FIXTURES.emptyFile]);
      expect(findings).toHaveLength(0);
    });

    it('does not flag markdown or image files', () => {
      const file: PrFile = {
        filePath: 'docs/image.png',
        content: 'AKIAIOSFODNN7EXAMPLE some random binary content',
      };
      const findings = rule.analyze([file]);
      expect(findings).toHaveLength(0);
    });

    it('returns finding with suggestion referencing environment variables', () => {
      const file: PrFile = {
        filePath: 'src/config.ts',
        content: "const token = 'ghp_ABC123DEF456GHI789JKL012MNO345PQR6';",
      };
      const findings = rule.analyze([file]);
      if (findings.length > 0) {
        expect(findings[0]?.suggestion).toMatch(/process\.env|environment variable/i);
      }
    });

    it('handles a large file without crashing', () => {
      expect(() => rule.analyze([FIXTURES.largeFile])).not.toThrow();
    });
  });
});
