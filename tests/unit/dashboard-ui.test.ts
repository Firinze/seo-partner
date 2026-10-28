import { describe, expect, it } from 'vitest';
import type { DashboardOverview, PatchBatchResult } from '@seo-partner/core';
import {
  DashboardApiClient,
  escapeHtml,
  getDashboardDictionary,
  renderAlertBanner,
  renderBacklogFeature,
  renderBadge,
  renderButton,
  renderCard,
  renderCrawlComparatorFeature,
  renderDashboardCss,
  renderDashboardSpaHtml,
  renderDataTable,
  renderDecisionsReportsFeature,
  renderFindingsFeature,
  renderOverviewFeature,
  renderPatchesFeature,
  renderRoutesSearchFeature,
  renderSearchInput,
  renderSelectFilter,
  renderTabs,
} from '@seo-partner/dashboard';

describe('Dashboard UI Components, Features & Unified HTTP Client (@seo-partner/dashboard)', () => {
  it('renders reusable UI components with semantic HTML5, WCAG 2.2 AA ARIA roles, and strict XSS escaping', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );

    const card = renderCard({
      id: 'test-card',
      title: 'Synthese Projet',
      ariaLabel: 'Section Synthese',
      childrenHtml: '<p>Contenu</p>',
    });
    expect(card).toContain('<section id="test-card" aria-label="Section Synthese"');
    expect(card).toContain('Synthese Projet');

    const badge = renderBadge({ label: 'Bloquant Indexation', variant: 'blocker' });
    expect(badge).toContain('Bloquant Indexation');

    const btn = renderButton({
      id: 'btn-action',
      label: 'Relancer',
      variant: 'primary',
      ariaLabel: 'Relancer le scan',
    });
    expect(btn).toContain('id="btn-action"');
    expect(btn).toContain('aria-label="Relancer le scan"');

    const table = renderDataTable({
      id: 'tbl-routes',
      caption: 'Table des routes',
      headers: ['Route', 'Titre'],
      rowsHtml: [],
      emptyMessage: 'Aucune route trouvee',
    });
    expect(table).toContain('<caption class="sr-only">Table des routes</caption>');
    expect(table).toContain('Aucune route trouvee');

    const search = renderSearchInput({
      id: 'q-input',
      label: 'Rechercher',
      placeholder: 'Mot-cle',
      value: 'seo',
    });
    expect(search).toContain('for="q-input"');

    const select = renderSelectFilter({
      id: 'sel-cat',
      label: 'Categorie',
      selectedValue: 'technical',
      options: [{ value: 'technical', label: 'Technique' }],
    });
    expect(select).toContain('selected');

    const tabs = renderTabs('Navigation principale', [
      { id: 't1', label: 'Vue', panelId: 'p1', active: true },
      { id: 't2', label: 'Routes', panelId: 'p2', active: false },
    ]);
    expect(tabs).toContain('role="tablist"');
    expect(tabs).toContain('aria-selected="true"');

    const alert = renderAlertBanner({
      id: 'alert-1',
      message: 'Session initialisee',
      variant: 'info',
    });
    expect(alert).toContain('role="status"');
    expect(alert).toContain('aria-live="polite"');
  });

  it('renders all 6 Feature views and full SPA HTML in FR and EN with zero glassmorphism and zero emojis', () => {
    const css = renderDashboardCss();
    expect(css).not.toContain('backdrop-filter');
    expect(css).not.toContain('feGaussianBlur');
    expect(css).not.toContain('border-left');
    expect(css).not.toContain('border-right');
    expect(css).not.toContain('box-shadow');
    expect(css).not.toContain('scale(');
    expect(css).not.toContain('.ui-card:hover');
    expect(css).not.toContain('.kpi-tile:hover');

    const overview: DashboardOverview = {
      project: {
        id: 'proj_12345678',
        rootPath: '/workspace/app',
        name: 'demo-app',
        frameworks: ['nextjs'],
        hasRobotsTxt: true,
        hasSitemap: true,
        createdAt: '2026-10-28T10:00:00Z',
        lastScannedAt: '2026-10-28T10:05:00Z',
      },
      stats: {
        filesScanned: 12,
        routesCount: 4,
        totalFindings: 2,
        blockingIndexingCount: 1,
        bySeverity: { critical: 1, high: 1, medium: 0, low: 0 },
        byCategory: { technical: 1, 'on-page': 1, schema: 0, local: 0, geo: 0, performance: 0 },
        decisionsCount: 1,
      },
      latestCrawlRun: null,
    };

    const spaFr = renderDashboardSpaHtml({
      lang: 'fr',
      overview,
      routes: [],
      findings: [],
      backlog: [],
      comparisonRows: [],
      decisions: [],
    });
    expect(spaFr).toContain('<html lang="fr">');
    expect(spaFr).toContain(getDashboardDictionary('fr').tabOverview);
    expect(spaFr).not.toContain('backdrop-filter');
    expect(spaFr).not.toContain('border-l-');
    expect(spaFr).not.toContain('border-r-');
    expect(spaFr).not.toContain('hover:shadow');
    // Ensure zero emojis in generated HTML
    expect(/[\u{1F300}-\u{1FAFF}]/u.test(spaFr)).toBe(false);

    const spaEn = renderDashboardSpaHtml({
      lang: 'en',
      overview,
      routes: [],
      findings: [],
      backlog: [],
      comparisonRows: [],
      decisions: [],
    });
    expect(spaEn).toContain('<html lang="en">');
    expect(spaEn).toContain(getDashboardDictionary('en').tabOverview);

    expect(renderOverviewFeature(overview, 'fr')).toContain('demo-app');
    expect(renderRoutesSearchFeature([], 'fr')).toContain('form-fts-search');
    expect(renderFindingsFeature([], 'fr')).toContain('table');
    expect(renderBacklogFeature([], 'fr')).toContain('ICE');
    expect(renderCrawlComparatorFeature([], null, 'fr')).toContain('Crawl');
    expect(renderDecisionsReportsFeature([], 'fr')).toContain('decisions');
  });

  it('includes credentials: include and invokes 401/403 interceptor in DashboardApiClient', async () => {
    const seenCredentials: Array<string | undefined> = [];
    const interceptedStatuses: number[] = [];

    const client = new DashboardApiClient({
      baseUrl: 'http://127.0.0.1:4321',
      fetcher: async (_input, init) => {
        seenCredentials.push(init?.credentials);
        return new Response(
          JSON.stringify({
            success: false,
            data: {
              problem: {
                type: 'https://seo-partner.local/problems/unauthorized-session',
                title: 'Unauthorized',
                status: 401,
                detail: 'Missing session cookie',
                instance: '/api/v1/scan',
              },
            },
            error: 'Missing session cookie',
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      },
      onUnauthorized: (status) => {
        interceptedStatuses.push(status);
      },
    });

    const res = await client.request('/api/v1/scan', { method: 'POST' });
    expect(res.success).toBe(false);
    expect(seenCredentials[0]).toBe('include');
    expect(interceptedStatuses).toEqual([401]);
  });

  it('renders Patches feature with empty and populated batches, XSS escaping, diff colors, and zero emojis', () => {
    // 1. Empty state
    const emptyFr = renderPatchesFeature({ lang: 'fr', patches: [] });
    expect(emptyFr).toContain(escapeHtml(getDashboardDictionary('fr').patchesNoBatches));
    expect(emptyFr).toContain('btn-propose-patches');

    const emptyEn = renderPatchesFeature({ lang: 'en', patches: [] });
    expect(emptyEn).toContain(escapeHtml(getDashboardDictionary('en').patchesNoBatches));

    // 2. Populated state with malicious XSS diff line
    const sampleBatch: PatchBatchResult = {
      batchId: 'patch_20261028-120000_abcdef',
      createdAt: '2026-10-28T12:00:00Z',
      diffPath: '.seo/patches/patch_20261028-120000_abcdef.diff',
      filesCovered: 1,
      proposals: [
        {
          id: 'prop-1',
          findingId: 'find-1',
          ruleId: 'R-ONPAGE-01',
          filePath: 'app/page.tsx',
          kind: 'modify',
          hunks: [
            {
              oldStart: 1,
              oldLines: 1,
              newStart: 1,
              newLines: 2,
              lines: [' <main>', '+<title><script>alert("xss")</script> & "val"</title>'],
            },
          ],
          diff: '@@ -1,1 +1,2 @@\n <main>\n+<title><script>alert("xss")</script> & "val"</title>',
          manualReviewRequired: false,
          todoMarkers: 1,
        },
      ],
      skipped: [
        {
          findingId: 'find-2',
          ruleId: 'R-TECH-03',
          reason: 'framework-metadata',
          message: 'No literal noindex found',
        },
      ],
      applied: false,
      appliedAt: null,
      backupDir: null,
      todoMarkersRemaining: 1,
      initialScanPerformed: true,
    };

    const populatedFr = renderPatchesFeature({ lang: 'fr', patches: [sampleBatch] });
    expect(populatedFr).toContain('patch_20261028-120000_abcdef');
    expect(populatedFr).toContain('app/page.tsx');
    expect(populatedFr).toContain('R-ONPAGE-01');
    expect(populatedFr).toContain('diff-add');
    expect(populatedFr).toContain('diff-ctx');

    // Verify strict XSS escaping in diff output
    expect(populatedFr).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;val&quot;');
    expect(populatedFr).not.toContain('<script>alert("xss")</script>');

    // 3. Verify Full SPA HTML includes 7th tab
    const overview: DashboardOverview = {
      project: null,
      stats: {
        filesScanned: 0,
        routesCount: 0,
        totalFindings: 0,
        blockingIndexingCount: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        byCategory: { technical: 0, 'on-page': 0, schema: 0, local: 0, geo: 0, performance: 0 },
        decisionsCount: 0,
      },
      latestCrawlRun: null,
    };
    const fullSpa = renderDashboardSpaHtml({
      lang: 'fr',
      overview,
      routes: [],
      findings: [],
      backlog: [],
      comparisonRows: [],
      decisions: [],
      patches: [sampleBatch],
    });
    expect(fullSpa).toContain('tab-btn-patches');
    expect(fullSpa).toContain('panel-patches');
    expect(fullSpa).toContain('patch_20261028-120000_abcdef');

    // Anti-regression: 0 emojis, 0 backdrop-filter, 0 lateral borders
    expect(/[\u{1F300}-\u{1FAFF}]/u.test(fullSpa)).toBe(false);
    expect(fullSpa).not.toContain('backdrop-filter');
    expect(fullSpa).not.toContain('border-l-');
    expect(fullSpa).not.toContain('border-r-');
  });
});
