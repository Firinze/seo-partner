import { describe, expect, it } from 'vitest';
import {
  scanDirectoryForSecrets,
  scanFileForSecrets,
} from '../../scripts/verify-no-secrets.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('US2: Zero Secret Leak & Supply-Chain Guardrail Verification', () => {
  it('guarantees zero real secrets are committed or present in production packages', () => {
    const report = scanDirectoryForSecrets(process.cwd());

    expect(report.filesScanned).toBeGreaterThan(50);
    expect(report.clean).toBe(true);
    expect(report.findings).toHaveLength(0);
  });

  it('accurately identifies and reports deliberate mock secret injection', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-sec-test-'));
    const testFile = path.join(tmpDir, 'sample-config.json');

    try {
      fs.writeFileSync(
        testFile,
        JSON.stringify({
          service: 'google',
          apiKey: ['AIza', 'SyDummyKeyForTestingPurposes35Chars'].join(''),
        }),
        'utf-8',
      );

      const findings = scanFileForSecrets(testFile);
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0]?.ruleId).toBe('google-api-key');
      expect(findings[0]?.masked).toContain('...');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
