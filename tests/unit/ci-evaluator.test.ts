import { describe, it, expect } from 'vitest';
import { evaluateCiThresholds, generateStepSummaryMarkdown } from '../../packages/tools/src/ci/evaluator.js';
import type { Finding } from '@seo-partner/core';

describe('US2: CI Evaluator & Threshold Enforcement', () => {
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
        filePath: 'pages/index.tsx',
        lineNumber: 12,
        observed: 'noindex',
        expected: 'index',
      },
      ice: {
        impact: 10,
        confidence: 10,
        effort: 2,
        score: 7.33,
        rationale: { en: 'Noindex blocks indexing', fr: 'Bloque indexation' },
      },
      remediation: {
        en: 'Remove noindex directive',
        fr: 'Supprimer la directive noindex',
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
      ruleId: 'R-ONPAGE-01',
      subjectRef: 'src/pages/about.tsx',
      category: 'on-page',
      severity: 'high',
      blocksIndexing: false,
      evidence: {
        source: 'code-scan',
        filePath: 'pages/about.tsx',
        lineNumber: 5,
        observed: 'missing title',
        expected: 'title present',
      },
      ice: {
        impact: 8,
        confidence: 9,
        effort: 2,
        score: 6.33,
        rationale: { en: 'Missing title', fr: 'Titre manquant' },
      },
      remediation: {
        en: 'Add title',
        fr: 'Ajouter title',
      },
      ownerRole: 'content',
      targetTimeframe: 'immediate',
      kpi: { en: '', fr: '' },
      officialSourceUrl: 'https://developers.google.com',
      status: 'open',
      firstSeenAt: '2026-10-28T12:00:00Z',
      lastSeenAt: '2026-10-28T12:00:00Z',
      resolvedAt: null,
    },
  ];

  it('fails with exitCode 1 by default when an indexing blocker is present (F-R3)', () => {
    const result = evaluateCiThresholds(sampleFindings, { failOnBlockers: true });

    expect(result.passed).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.blockingIndexingCount).toBe(1);
    expect(result.thresholdsViolated).toContain('failOnBlockers (1 blocking issues found)');
    expect(result.markdownSummary).toContain('R-TECH-03');
  });

  it('passes with exitCode 0 when no blockers or criticals exist and thresholds are respected', () => {
    const cleanFindings: Finding[] = [sampleFindings[1]!]; // only high, no blocker

    const result = evaluateCiThresholds(cleanFindings, {
      failOnBlockers: true,
      maxCritical: 0,
      maxHigh: 5,
    });

    expect(result.passed).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.blockingIndexingCount).toBe(0);
    expect(result.criticalCount).toBe(0);
    expect(result.thresholdsViolated).toHaveLength(0);
  });

  it('fails when maxCritical threshold is exceeded', () => {
    const result = evaluateCiThresholds(sampleFindings, {
      failOnBlockers: false,
      maxCritical: 0,
    });

    expect(result.passed).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.criticalCount).toBe(1);
    expect(result.thresholdsViolated).toContain('maxCritical exceeded (1 > 0)');
  });

  it('fails when minScore threshold is not achieved', () => {
    const result = evaluateCiThresholds(sampleFindings, {
      failOnBlockers: false,
      maxCritical: 5,
      minScore: 8.0,
    });

    expect(result.passed).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.thresholdsViolated[0]).toContain('minScore not met');
  });

  it('generates clean GitHub Step Summary Markdown with 0 emojis', () => {
    const markdown = generateStepSummaryMarkdown({
      passed: false,
      exitCode: 1,
      evaluatedAt: '2026-10-28T12:00:00Z',
      totalFindings: 2,
      blockingIndexingCount: 1,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
      thresholdsViolated: ['failOnBlockers'],
      findings: [
        {
          ruleId: 'R-TECH-03',
          ruleTitle: 'Accidental Noindex',
          severity: 'critical',
          category: 'technical',
          blocksIndexing: true,
          iceScore: 7.33,
          filePath: 'pages/index.tsx',
          lineNumber: 12,
          message: 'Page contains noindex',
        },
      ],
      markdownSummary: '',
    });

    expect(markdown).toContain('SEO CI/CD Compliance Report');
    expect(markdown).toContain('FAIL');
    expect(markdown).toContain('R-TECH-03');
    expect(markdown).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // 0 emoji
  });
});

