import { describe, expect, it } from 'vitest';
import { checkReleaseReadiness } from '../../scripts/release-check.mjs';

describe('US4: Official npm Distribution & Multi-Package Release Readiness', () => {
  it('confirms all 12 monorepo packages are versioned 1.0.0 with public publishConfig', () => {
    const report = checkReleaseReadiness(process.cwd());

    expect(report.valid).toBe(true);
    expect(report.version).toBe('1.0.0');
    expect(report.packagesCount).toBe(12);
    expect(report.issues).toHaveLength(0);

    for (const pkg of report.packages) {
      expect(pkg.version).toBe('1.0.0');
      expect(pkg.access).toBe('public');
    }
  });
});

