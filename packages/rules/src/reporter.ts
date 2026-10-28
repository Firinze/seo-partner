import fs from 'node:fs';
import path from 'node:path';
import type {
  Finding,
  PrioritizedAction,
  ProjectRecord,
  ReportType,
  SupportedLanguage,
} from '@seo-partner/core';

export interface GenerateReportOptions {
  readonly projectRoot: string;
  readonly project: ProjectRecord;
  readonly findings: ReadonlyArray<Finding>;
  readonly actions: ReadonlyArray<PrioritizedAction>;
  readonly lang: SupportedLanguage;
  readonly reportType: ReportType;
  readonly customOutputPath?: string;
}

export function generateMarkdownReportContent(options: GenerateReportOptions): string {
  const { project, findings, actions, lang, reportType } = options;
  const today = new Date().toISOString().slice(0, 10);
  const reviewDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const blockingCount = findings.filter((f) => f.blocksIndexing).length;
  const criticalOrHighCount = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  ).length;

  const top3Actions = actions
    .slice(0, 3)
    .map((a) => `${a.ruleId} (${a.subjectRef})`)
    .join(', ') || (lang === 'fr' ? 'Aucune anomalie critique' : 'No critical issues');

  if (lang === 'fr') {
    const summaryLines = [
      `**Projet** : \`${project.name}\` (${project.frameworks.join(', ') || 'statique'}) — Audit \`${reportType}\` du ${today}.`,
      `**Situation** : ${findings.length} constat(s) détecté(s), dont **${blockingCount} bloquant(s) pour l'indexation** et ${criticalOrHighCount} de sévérité critique/haute.`,
      `**3 Priorités immédiates** : ${top3Actions}.`,
      `**Impact attendu** : Déblocage complet de l'indexation et amélioration du CTR organique sous 30 à 90 jours (sans garantie de position).`,
      `**Méthode** : Constats déterministes vérifiés avec preuves (fichier + ligne) et priorisation ICE.`,
    ];

    const findingsRows =
      findings.length === 0
        ? '_Aucun constat détecté._'
        : findings
            .map(
              (f) =>
                `- **[${f.ruleId}] (${f.severity.toUpperCase()}${f.blocksIndexing ? ' — BLOQUE L INDEXATION' : ''})** sur \`${f.subjectRef}\`\n` +
                `  - **Preuve** : \`${f.evidence.filePath}:${f.evidence.lineNumber}\` — Observé : \`${f.evidence.observed}\` (Attendu : \`${f.evidence.expected}\`)\n` +
                `  - **Correctif** : ${f.remediation.fr}\n` +
                `  - **Source officielle** : ${f.officialSourceUrl}`,
            )
            .join('\n');

    const actionsTableRows = actions
      .map(
        (a) =>
          `| \`${a.ruleId}\` — ${a.remediation.fr} | **${a.ice.score.toFixed(2)}** (I:${a.ice.impact} C:${a.ice.confidence} E:${a.ice.effort})${a.blocksIndexing ? ' [BLOQUANT]' : ''} | \`${a.ownerRole}\` | \`${a.targetTimeframe}\` | ${a.kpi.fr} |`,
      )
      .join('\n');

    return [
      `# Rapport SEO : ${project.name} (${reportType})`,
      '',
      `## 1. Résumé décisionnel`,
      '',
      ...summaryLines,
      '',
      `## 2. Constats avec preuves`,
      '',
      findingsRows,
      '',
      `## 3. Actions priorisées (Score ICE)`,
      '',
      `| Action | Score ICE | Responsable | Délai | KPI de succès |`,
      `| --- | --- | --- | --- | --- |`,
      actionsTableRows || '| Aucune action requise | - | - | - | - |',
      '',
      `## 4. Impact attendu`,
      '',
      `- **Fourchette réaliste (3 à 6 mois)** : Résolution de 100 % des blocages techniques d'indexation dès déploiement ; progression estimée de **+10 % à +25 % d'impressions et de clics qualifiés** sur les pages corrigées.`,
      `- **Hypothèses explicites** : Soumission du sitemap dans Google Search Console après déploiement et maintien d'un rythme de publication conforme à l'intention de recherche. Aucune position fixe ni délai garanti ne peuvent être promis.`,
      '',
      `## 5. Suivi`,
      '',
      `- **Prochaine revue prévue** : ${reviewDate}`,
      `- **Métriques à surveiller** : Pages indexées valides (Search Console), Impressions hors marque, CTR par page, Core Web Vitals.`,
      '',
    ].join('\n');
  }

  const summaryLinesEn = [
    `**Project**: \`${project.name}\` (${project.frameworks.join(', ') || 'static'}) — \`${reportType}\` report generated on ${today}.`,
    `**Situation**: ${findings.length} finding(s) detected, including **${blockingCount} indexing blocker(s)** and ${criticalOrHighCount} critical/high severity issue(s).`,
    `**Top 3 Immediate Priorities**: ${top3Actions}.`,
    `**Expected Impact**: Full indexing recovery and organic CTR lift within 30 to 90 days (no guaranteed rankings).`,
    `**Method**: Deterministic static scan with mandatory file+line evidence and ICE prioritization.`,
  ];

  const findingsRowsEn =
    findings.length === 0
      ? '_No findings detected._'
      : findings
          .map(
            (f) =>
              `- **[${f.ruleId}] (${f.severity.toUpperCase()}${f.blocksIndexing ? ' — BLOCKS INDEXING' : ''})** on \`${f.subjectRef}\`\n` +
              `  - **Evidence**: \`${f.evidence.filePath}:${f.evidence.lineNumber}\` — Observed: \`${f.evidence.observed}\` (Expected: \`${f.evidence.expected}\`)\n` +
              `  - **Remediation**: ${f.remediation.en}\n` +
              `  - **Official Source**: ${f.officialSourceUrl}`,
          )
          .join('\n');

  const actionsTableRowsEn = actions
    .map(
      (a) =>
        `| \`${a.ruleId}\` — ${a.remediation.en} | **${a.ice.score.toFixed(2)}** (I:${a.ice.impact} C:${a.ice.confidence} E:${a.ice.effort})${a.blocksIndexing ? ' [BLOCKER]' : ''} | \`${a.ownerRole}\` | \`${a.targetTimeframe}\` | ${a.kpi.en} |`,
    )
    .join('\n');

  return [
    `# SEO Report: ${project.name} (${reportType})`,
    '',
    `## 1. Executive Summary`,
    '',
    ...summaryLinesEn,
    '',
    `## 2. Findings with Evidence`,
    '',
    findingsRowsEn,
    '',
    `## 3. Prioritized Actions (ICE Score)`,
    '',
    `| Action | ICE Score | Owner | Timeframe | Success KPI |`,
    `| --- | --- | --- | --- | --- |`,
    actionsTableRowsEn || '| No action required | - | - | - | - |',
    '',
    `## 4. Expected Impact`,
    '',
    `- **Realistic range (3 to 6 months)**: Immediate resolution of 100% of technical indexing blockers upon deployment; estimated **+10% to +25% lift in qualified impressions and clicks** across remediated routes.`,
    `- **Explicit assumptions**: Updated sitemap submitted in Google Search Console post-release. No fixed ranking position or guaranteed timeline is promised.`,
    '',
    `## 5. Follow-up`,
    '',
    `- **Next scheduled review**: ${reviewDate}`,
    `- **Metrics to monitor**: Valid indexed pages (Search Console), non-branded impressions, page CTR, Core Web Vitals.`,
    '',
  ].join('\n');
}

export function writeMarkdownReport(options: GenerateReportOptions): {
  readonly filePath: string;
  readonly markdown: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  const defaultRelPath = path.join('docs', 'seo', `${today}-${options.reportType}.md`);
  const targetPath = options.customOutputPath
    ? path.resolve(options.projectRoot, options.customOutputPath)
    : path.resolve(options.projectRoot, defaultRelPath);

  const markdown = generateMarkdownReportContent(options);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, markdown, 'utf-8');

  return { filePath: targetPath, markdown };
}

