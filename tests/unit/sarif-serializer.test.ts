import { describe, it, expect } from 'vitest';
import { serializeToSarifLog } from '../../packages/tools/src/ci/sarif.js';
import type { Finding } from '@seo-partner/core';

describe('US2: OASIS SARIF v2.1.0 Serializer', () => {
  const sampleFindings: Finding[] = [
    {
      id: 'f-1',
      ruleId: 'R-TECH-03',
      subjectRef: 'src/pages/index.tsx',
      category: 'technical',
      severity: 'critical',
      blocksIndexing: true,
      evidence: {
        source: 'code-scan',
        filePath: 'src/pages/index.tsx',
        lineNumber: 14,
        observed: 'meta noindex',
        expected: 'index, follow',
      },
      ice: {
        impact: 10,
        confidence: 10,
        effort: 2,
        score: 7.33,
        rationale: { en: 'Blocks crawling', fr: 'Bloque le crawl' },
      },
      remediation: {
        en: 'Remove noindex',
        fr: 'Supprimer noindex',
      },
      ownerRole: 'dev',
      targetTimeframe: 'immediate',
      kpi: { en: '', fr: '' },
      officialSourceUrl: 'https://developers.google.com',
      status: 'open',
      firstSeenAt: '2026-10-28T12:00:00Z',
      lastSeenAt: '2026-10-28T12:00:00Z',
      resolvedAt: null,
    },
    {
      id: 'f-2',
      ruleId: 'R-ONPAGE-04',
      subjectRef: 'src/components/Header.tsx',
      category: 'on-page',
      severity: 'medium',
      blocksIndexing: false,
      evidence: {
        source: 'code-scan',
        filePath: 'src/components/Header.tsx',
        lineNumber: 22,
        observed: 'missing h1',
        expected: 'single h1',
      },
      ice: {
        impact: 6,
        confidence: 8,
        effort: 2,
        score: 5.33,
        rationale: { en: 'Missing h1', fr: 'H1 manquant' },
      },
      remediation: {
        en: 'Add h1 heading',
        fr: 'Ajouter une balise h1',
      },
      ownerRole: 'dev',
      targetTimeframe: 'immediate',
      kpi: { en: '', fr: '' },
      officialSourceUrl: 'https://developers.google.com',
      status: 'open',
      firstSeenAt: '2026-10-28T12:00:00Z',
      lastSeenAt: '2026-10-28T12:00:00Z',
      resolvedAt: null,
    },
  ];

  it('generates a valid OASIS SARIF v2.1.0 document structure', () => {
    const sarif = serializeToSarifLog(sampleFindings, { version: '0.7.0' });

    expect(sarif.$schema).toBe('https://docs.oasis-open.org/sarif/sarif/v2.1.0/cos01/schemas/sarif-schema-2.1.0.json');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);

    const run = sarif.runs[0]!;
    const driver = run.tool.driver;
    expect(driver.name).toBe('seo-partner');
    expect(driver.semanticVersion).toBe('0.7.0');
    expect(driver.informationUri).toContain('github.com');
    expect(driver.rules.length).toBeGreaterThanOrEqual(2);
    expect(driver.rules.some((r) => r.id === 'R-TECH-03')).toBe(true);
    expect(driver.rules.some((r) => r.id === 'R-ONPAGE-04')).toBe(true);
  });

  it('maps severity levels to SARIF levels (error for critical/high, warning for medium, note for low)', () => {
    const sarif = serializeToSarifLog(sampleFindings);
    const run = sarif.runs[0]!;
    const results = run.results;

    expect(results).toHaveLength(2);

    const criticalResult = results.find((r) => r.ruleId === 'R-TECH-03')!;
    expect(criticalResult.level).toBe('error');
    const critLoc = criticalResult.locations[0]!;
    expect(critLoc.physicalLocation.artifactLocation.uri).toBe('src/pages/index.tsx');
    expect(critLoc.physicalLocation.region?.startLine).toBe(14);
    expect(criticalResult.properties?.blocksIndexing).toBe(true);
    expect(criticalResult.properties?.iceScore).toBe(7.33);

    const mediumResult = results.find((r) => r.ruleId === 'R-ONPAGE-04')!;
    expect(mediumResult.level).toBe('warning');
    const medLoc = mediumResult.locations[0]!;
    expect(medLoc.physicalLocation.artifactLocation.uri).toBe('src/components/Header.tsx');
    expect(medLoc.physicalLocation.region?.startLine).toBe(22);
  });

  it('guarantees 0 emojis in SARIF output text', () => {
    const sarif = serializeToSarifLog(sampleFindings);
    const jsonStr = JSON.stringify(sarif);

    expect(jsonStr).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });
});

