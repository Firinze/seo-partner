import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluateCwvThreshold,
  CruxClient,
  PageSpeedClient,
} from '@seo-partner/connectors';
import { evaluatePerfRules, PERF_RULES } from '@seo-partner/rules';

describe('Core Web Vitals Threshold Evaluator', () => {
  it('correctly classifies LCP thresholds', () => {
    expect(evaluateCwvThreshold('LCP', 2400)).toBe('good');
    expect(evaluateCwvThreshold('LCP', 2500)).toBe('good');
    expect(evaluateCwvThreshold('LCP', 2501)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('LCP', 4000)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('LCP', 4001)).toBe('poor');
  });

  it('correctly classifies INP thresholds', () => {
    expect(evaluateCwvThreshold('INP', 150)).toBe('good');
    expect(evaluateCwvThreshold('INP', 200)).toBe('good');
    expect(evaluateCwvThreshold('INP', 350)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('INP', 500)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('INP', 550)).toBe('poor');
  });

  it('correctly classifies CLS thresholds', () => {
    expect(evaluateCwvThreshold('CLS', 0.05)).toBe('good');
    expect(evaluateCwvThreshold('CLS', 0.1)).toBe('good');
    expect(evaluateCwvThreshold('CLS', 0.15)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('CLS', 0.25)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('CLS', 0.3)).toBe('poor');
  });

  it('correctly classifies TTFB thresholds', () => {
    expect(evaluateCwvThreshold('TTFB', 700)).toBe('good');
    expect(evaluateCwvThreshold('TTFB', 800)).toBe('good');
    expect(evaluateCwvThreshold('TTFB', 1200)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('TTFB', 1800)).toBe('needs-improvement');
    expect(evaluateCwvThreshold('TTFB', 2000)).toBe('poor');
  });
});

describe('CruxClient', () => {
  const phoneFixture = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../fixtures/cwv-mock/crux-response-phone.json'),
      'utf-8',
    ),
  );
  const desktopFixture = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../fixtures/cwv-mock/crux-response-desktop.json'),
      'utf-8',
    ),
  );
  const originFixture = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../fixtures/cwv-mock/crux-origin-fallback.json'),
      'utf-8',
    ),
  );

  it('fetches and parses phone and desktop metrics from CrUX', async () => {
    const mockFetch = async (_url: string | URL | any, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const data = body.formFactor === 'PHONE' ? phoneFixture : desktopFixture;
      return new Response(JSON.stringify(data), { status: 200 });
    };

    const client = new CruxClient({ fetchFn: mockFetch as any });
    const records = await client.fetchMetrics({
      projectId: 'proj-1',
      url: 'https://example.com/blog/article-1',
      formFactor: 'ALL',
    });

    expect(records).toHaveLength(2);

    const phone = records.find((r) => r.formFactor === 'PHONE')!;
    expect(phone.scope).toBe('url');
    expect(phone.lcpMs).toBe(3200);
    expect(phone.lcpRating).toBe('needs-improvement');
    expect(phone.inpMs).toBe(160);
    expect(phone.inpRating).toBe('good');
    expect(phone.clsScore).toBe(0.18);
    expect(phone.clsRating).toBe('needs-improvement');
    expect(phone.fcpMs).toBe(1700);
    expect(phone.ttfbMs).toBe(920);
    expect(phone.ttfbRating).toBe('needs-improvement');

    const desktop = records.find((r) => r.formFactor === 'DESKTOP')!;
    expect(desktop.scope).toBe('url');
    expect(desktop.lcpMs).toBe(1950);
    expect(desktop.lcpRating).toBe('good');
    expect(desktop.inpMs).toBe(85);
    expect(desktop.inpRating).toBe('good');
    expect(desktop.clsScore).toBe(0.04);
    expect(desktop.clsRating).toBe('good');
  });

  it('falls back to origin when url has no field data in CrUX', async () => {
    const mockFetch = async (_url: string | URL | any, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      if (body.url) {
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
      }
      return new Response(JSON.stringify(originFixture), { status: 200 });
    };

    const client = new CruxClient({ fetchFn: mockFetch as any });
    const records = await client.fetchMetrics({
      projectId: 'proj-1',
      url: 'https://example.com/unseen-page',
      formFactor: 'PHONE',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.scope).toBe('origin');
    expect(records[0]?.lcpMs).toBe(2400);
    expect(records[0]?.lcpRating).toBe('good');
  });
});

describe('PageSpeedClient', () => {
  const psiFixture = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../fixtures/cwv-mock/pagespeed-response.json'),
      'utf-8',
    ),
  );

  it('fetches and normalizes metrics from PageSpeed Insights API', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify(psiFixture), { status: 200 });
    };

    const client = new PageSpeedClient({ fetchFn: mockFetch as any });
    const record = await client.fetchMetrics({
      projectId: 'proj-1',
      url: 'https://example.com/blog/article-1',
      strategy: 'mobile',
    });

    expect(record).not.toBeNull();
    expect(record?.formFactor).toBe('PHONE');
    expect(record?.scope).toBe('url');
    expect(record?.lcpMs).toBe(3200);
    expect(record?.lcpRating).toBe('needs-improvement');
    expect(record?.inpMs).toBe(160);
    expect(record?.inpRating).toBe('good');
    expect(record?.clsScore).toBe(0.18);
    expect(record?.clsRating).toBe('needs-improvement');
    expect(record?.ttfbMs).toBe(920);
    expect(record?.ttfbRating).toBe('needs-improvement');
  });
});

describe('Core Web Vitals Rules Evaluation', () => {
  it('has 4 registered performance rules', () => {
    expect(PERF_RULES).toHaveLength(4);
    expect(PERF_RULES.map((r) => r.id)).toEqual([
      'R-PERF-01',
      'R-PERF-02',
      'R-PERF-03',
      'R-PERF-04',
    ]);
  });

  it('generates prioritized findings when metrics exceed thresholds', () => {
    const findings = evaluatePerfRules([
      {
        id: 'cwv-1',
        projectId: 'p1',
        url: 'https://example.com/slow',
        formFactor: 'PHONE',
        scope: 'url',
        lcpMs: 4500,
        lcpRating: 'poor',
        inpMs: 550,
        inpRating: 'poor',
        clsScore: 0.35,
        clsRating: 'poor',
        fcpMs: 2500,
        fcpRating: 'needs-improvement',
        ttfbMs: 1900,
        ttfbRating: 'poor',
        fetchedAt: '2026-10-28T12:00:00Z',
        expiresAt: '2026-11-04T12:00:00Z',
      },
    ]);

    expect(findings).toHaveLength(4);
    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('R-PERF-01');
    expect(ruleIds).toContain('R-PERF-02');
    expect(ruleIds).toContain('R-PERF-03');
    expect(ruleIds).toContain('R-PERF-04');

    const lcpFinding = findings.find((f) => f.ruleId === 'R-PERF-01')!;
    expect(lcpFinding.category).toBe('performance');
    expect(lcpFinding.evidence.source).toBe('cwv');
    expect(lcpFinding.ice.impact).toBe(9);
    expect(lcpFinding.officialSourceUrl).toBe('https://web.dev/articles/lcp');
  });

  it('generates zero findings when all metrics are good', () => {
    const findings = evaluatePerfRules([
      {
        id: 'cwv-good',
        projectId: 'p1',
        url: 'https://example.com/fast',
        formFactor: 'PHONE',
        scope: 'url',
        lcpMs: 1800,
        lcpRating: 'good',
        inpMs: 80,
        inpRating: 'good',
        clsScore: 0.02,
        clsRating: 'good',
        fcpMs: 900,
        fcpRating: 'good',
        ttfbMs: 300,
        ttfbRating: 'good',
        fetchedAt: '2026-10-28T12:00:00Z',
        expiresAt: '2026-11-04T12:00:00Z',
      },
    ]);

    expect(findings).toHaveLength(0);
  });
});
