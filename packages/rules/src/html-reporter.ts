import fs from 'node:fs';
import path from 'node:path';
import type { GenerateReportOptions } from './reporter.js';

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateHtmlReportContent(options: GenerateReportOptions): string {
  const { project, findings, actions, lang, reportType, crawlRun } = options;
  const today = new Date().toISOString().slice(0, 10);
  const reviewDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const blockingCount = findings.filter((f) => f.blocksIndexing).length;
  const criticalOrHighCount = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  ).length;

  const isFr = lang === 'fr';
  const docTitle = isFr
    ? `Rapport SEO : ${project.name} (${reportType})`
    : `SEO Report: ${project.name} (${reportType})`;

  const top3Actions =
    actions
      .slice(0, 3)
      .map((a) => `${a.ruleId} (${a.subjectRef})`)
      .join(', ') || (isFr ? 'Aucune anomalie critique' : 'No critical issues');

  const crawlSummaryHtml = crawlRun
    ? `<div class="crawl-box">
        <strong>${isFr ? 'Session de Crawl HTTP associée' : 'Associated HTTP Crawl Session'} :</strong>
        <code>${escapeHtml(crawlRun.id)}</code> —
        URL : <code>${escapeHtml(crawlRun.startUrl)}</code> —
        ${isFr ? 'Pages explorées' : 'Pages crawled'} : <strong>${crawlRun.pagesCrawled}</strong> —
        ${isFr ? 'Erreurs HTTP' : 'HTTP errors'} : <strong>${crawlRun.errorsCount}</strong>
      </div>`
    : '';

  const findingsRowsHtml =
    findings.length === 0
      ? `<tr><td colspan="5">${isFr ? 'Aucun constat détecté.' : 'No findings detected.'}</td></tr>`
      : findings
          .map((f) => {
            const sevClass = `sev-${escapeHtml(f.severity)}`;
            const blockerBadge = f.blocksIndexing
              ? `<span class="badge-blocker">${isFr ? 'BLOQUANT' : 'BLOCKER'}</span>`
              : '';
            const evidenceLoc = f.evidence.url
              ? `${f.evidence.url} (HTTP ${f.evidence.statusCode ?? 200})`
              : `${f.evidence.filePath}:${f.evidence.lineNumber}`;
            const remText = isFr ? f.remediation.fr : f.remediation.en;
            return `<tr>
              <td><code>${escapeHtml(f.ruleId)}</code> ${blockerBadge}</td>
              <td><span class="sev-badge ${sevClass}">${escapeHtml(f.severity.toUpperCase())}</span></td>
              <td><code>${escapeHtml(f.subjectRef)}</code></td>
              <td>
                <div><code>${escapeHtml(evidenceLoc)}</code></div>
                <div class="meta-note">${isFr ? 'Observé' : 'Observed'}: <code>${escapeHtml(f.evidence.observed)}</code></div>
                <div class="meta-note">${isFr ? 'Attendu' : 'Expected'}: <code>${escapeHtml(f.evidence.expected)}</code></div>
              </td>
              <td>
                <div>${escapeHtml(remText)}</div>
                <div class="meta-note"><a href="${escapeHtml(f.officialSourceUrl)}" rel="noopener noreferrer">${escapeHtml(f.officialSourceUrl)}</a></div>
              </td>
            </tr>`;
          })
          .join('\n');

  const actionsRowsHtml =
    actions.length === 0
      ? `<tr><td colspan="5">${isFr ? 'Aucune action requise.' : 'No action required.'}</td></tr>`
      : actions
          .map((a) => {
            const remText = isFr ? a.remediation.fr : a.remediation.en;
            const kpiText = isFr ? a.kpi.fr : a.kpi.en;
            const blockerText = a.blocksIndexing
              ? isFr
                ? ' [BLOQUANT]'
                : ' [BLOCKER]'
              : '';
            return `<tr>
              <td><code>${escapeHtml(a.ruleId)}</code> — ${escapeHtml(remText)}</td>
              <td><strong>${a.ice.score.toFixed(2)}</strong> (I:${a.ice.impact} C:${a.ice.confidence} E:${a.ice.effort})${escapeHtml(blockerText)}</td>
              <td><code>${escapeHtml(a.ownerRole)}</code></td>
              <td><code>${escapeHtml(a.targetTimeframe)}</code></td>
              <td>${escapeHtml(kpiText)}</td>
            </tr>`;
          })
          .join('\n');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    :root {
      --bg-primary: #050b08;
      --bg-panel: #0a1510;
      --bg-row-alt: #0d1c15;
      --border-emerald: #133928;
      --accent-emerald: #10b981;
      --accent-bright: #34d399;
      --text-main: #f0fdf4;
      --text-muted: #9ca3af;
      --sev-critical: #ef4444;
      --sev-high: #f97316;
      --sev-medium: #eab308;
      --sev-low: #10b981;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 24px;
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
    }
    .container {
      max-width: 1180px;
      margin: 0 auto;
    }
    header {
      border: 2px solid var(--accent-emerald);
      background-color: var(--bg-panel);
      padding: 24px 28px;
      margin-bottom: 28px;
    }
    .brand-bar {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent-bright);
      margin-bottom: 8px;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      color: var(--text-main);
    }
    h2 {
      margin-top: 32px;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border-emerald);
      color: var(--accent-bright);
      font-size: 20px;
    }
    section {
      background-color: var(--bg-panel);
      border: 1px solid var(--border-emerald);
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }
    .kpi-card {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-emerald);
      padding: 14px 18px;
    }
    .kpi-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--accent-bright);
    }
    .crawl-box {
      background-color: var(--bg-primary);
      border-left: 4px solid var(--accent-emerald);
      padding: 12px 16px;
      margin-top: 12px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      border: 1px solid var(--border-emerald);
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: var(--bg-primary);
      color: var(--accent-bright);
      font-weight: 600;
    }
    tr:nth-child(even) td {
      background-color: var(--bg-row-alt);
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12.5px;
      background-color: var(--bg-primary);
      padding: 2px 5px;
      border: 1px solid var(--border-emerald);
      color: var(--accent-bright);
    }
    a {
      color: var(--accent-bright);
      text-decoration: underline;
    }
    .meta-note {
      font-size: 12.5px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .badge-blocker {
      display: inline-block;
      background-color: var(--sev-critical);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      margin-left: 4px;
    }
    .sev-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      color: #050b08;
    }
    .sev-critical { background-color: var(--sev-critical); color: #ffffff; }
    .sev-high { background-color: var(--sev-high); }
    .sev-medium { background-color: var(--sev-medium); }
    .sev-low { background-color: var(--sev-low); }
    @media print {
      body { background-color: #ffffff; color: #111827; padding: 0; }
      header, section, .kpi-card { background-color: #ffffff; border-color: #d1d5db; }
      th, td { border-color: #d1d5db; color: #111827; }
      h1, h2, .kpi-value, code, a { color: #065f46; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-bar">SEO PARTNER v0.2 — DETERMINISTIC LOCAL-FIRST AUDIT</div>
      <h1>${escapeHtml(docTitle)}</h1>
      <div>
        <strong>${isFr ? 'Projet' : 'Project'} :</strong> <code>${escapeHtml(project.name)}</code>
        (${escapeHtml(project.frameworks.join(', ') || (isFr ? 'statique' : 'static'))}) —
        <strong>${isFr ? 'Date' : 'Date'} :</strong> ${escapeHtml(today)}
      </div>
      ${crawlSummaryHtml}
    </header>

    <section id="section-1">
      <h2>${isFr ? '1. Résumé décisionnel' : '1. Executive Summary'}</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">${isFr ? 'Constats totaux' : 'Total Findings'}</div>
          <div class="kpi-value">${findings.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${isFr ? 'Bloquants Indexation' : 'Indexing Blockers'}</div>
          <div class="kpi-value">${blockingCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${isFr ? 'Critiques & Hauts' : 'Critical & High'}</div>
          <div class="kpi-value">${criticalOrHighCount}</div>
        </div>
      </div>
      <p><strong>${isFr ? '3 Priorités immédiates' : 'Top 3 Immediate Priorities'} :</strong> ${escapeHtml(top3Actions)}.</p>
      <p><strong>${isFr ? 'Méthode' : 'Method'} :</strong> ${
        isFr
          ? 'Analyse déterministe combinant scan statique du code et crawl HTTP avec preuve obligatoire et score ICE.'
          : 'Deterministic analysis combining static code scan and HTTP crawl with mandatory evidence and ICE scoring.'
      }</p>
    </section>

    <section id="section-2">
      <h2>${isFr ? '2. Constats avec preuves' : '2. Findings with Evidence'}</h2>
      <table>
        <thead>
          <tr>
            <th>${isFr ? 'Règle' : 'Rule'}</th>
            <th>${isFr ? 'Sévérité' : 'Severity'}</th>
            <th>${isFr ? 'Cible' : 'Subject'}</th>
            <th>${isFr ? 'Preuve' : 'Evidence'}</th>
            <th>${isFr ? 'Correctif & Source' : 'Remediation & Source'}</th>
          </tr>
        </thead>
        <tbody>
          ${findingsRowsHtml}
        </tbody>
      </table>
    </section>

    <section id="section-3">
      <h2>${isFr ? '3. Actions priorisées (Score ICE)' : '3. Prioritized Actions (ICE Score)'}</h2>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>${isFr ? 'Score ICE' : 'ICE Score'}</th>
            <th>${isFr ? 'Responsable' : 'Owner'}</th>
            <th>${isFr ? 'Délai' : 'Timeframe'}</th>
            <th>${isFr ? 'KPI de succès' : 'Success KPI'}</th>
          </tr>
        </thead>
        <tbody>
          ${actionsRowsHtml}
        </tbody>
      </table>
    </section>

    <section id="section-4">
      <h2>${isFr ? '4. Impact attendu' : '4. Expected Impact'}</h2>
      <ul>
        <li><strong>${isFr ? 'Fourchette réaliste (3 à 6 mois)' : 'Realistic range (3 to 6 months)'} :</strong> ${
          isFr
            ? "Résolution de 100 % des blocages techniques d'indexation dès déploiement ; progression estimée de +10 % à +25 % d'impressions et de clics qualifiés sur les pages corrigées."
            : 'Immediate resolution of 100% of technical indexing blockers upon deployment; estimated +10% to +25% lift in qualified impressions and clicks across remediated routes.'
        }</li>
        <li><strong>${isFr ? 'Hypothèses explicites' : 'Explicit assumptions'} :</strong> ${
          isFr
            ? 'Soumission du sitemap dans Google Search Console après déploiement. Aucune position fixe ni délai garanti ne peuvent être promis.'
            : 'Updated sitemap submitted in Google Search Console post-release. No fixed ranking position or guaranteed timeline is promised.'
        }</li>
      </ul>
    </section>

    <section id="section-5">
      <h2>${isFr ? '5. Suivi' : '5. Follow-up'}</h2>
      <ul>
        <li><strong>${isFr ? 'Prochaine revue prévue' : 'Next scheduled review'} :</strong> ${escapeHtml(reviewDate)}</li>
        <li><strong>${isFr ? 'Métriques à surveiller' : 'Metrics to monitor'} :</strong> ${
          isFr
            ? 'Pages indexées valides (Search Console), Impressions hors marque, CTR par page, Core Web Vitals.'
            : 'Valid indexed pages (Search Console), non-branded impressions, page CTR, Core Web Vitals.'
        }</li>
      </ul>
    </section>
  </div>
</body>
</html>`;
}

export function writeHtmlReport(options: GenerateReportOptions): {
  readonly filePath: string;
  readonly html: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  const defaultRelPath = path.join('docs', 'seo', `${today}-${options.reportType}.html`);
  const targetPath = options.customOutputPath
    ? path.resolve(options.projectRoot, options.customOutputPath)
    : path.resolve(options.projectRoot, defaultRelPath);

  const html = generateHtmlReportContent(options);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, html, 'utf-8');

  return { filePath: targetPath, html };
}

