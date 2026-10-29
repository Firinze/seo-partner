import type { SupportedLanguage } from '@seo-partner/core';

export interface DashboardDictionary {
  readonly brandSubtitle: string;
  readonly navLabel: string;
  readonly langLabel: string;
  readonly tabOverview: string;
  readonly tabRoutes: string;
  readonly tabFindings: string;
  readonly tabBacklog: string;
  readonly tabCrawl: string;
  readonly tabDecisions: string;
  readonly tabPatches: string;
  readonly kpiRoutes: string;
  readonly kpiFiles: string;
  readonly kpiBlockers: string;
  readonly kpiFindings: string;
  readonly kpiDecisions: string;
  readonly btnScanAudit: string;
  readonly severityBreakdownTitle: string;
  readonly categoryBreakdownTitle: string;
  readonly latestCrawlTitle: string;
  readonly noCrawlYet: string;
  readonly searchPlaceholder: string;
  readonly searchButton: string;
  readonly colRoute: string;
  readonly colRouter: string;
  readonly colTitle: string;
  readonly colH1: string;
  readonly colLang: string;
  readonly colSitemap: string;
  readonly colRule: string;
  readonly colSeverity: string;
  readonly colSubject: string;
  readonly colEvidence: string;
  readonly colRemediation: string;
  readonly colIceScore: string;
  readonly colOwner: string;
  readonly colTimeframe: string;
  readonly colKpi: string;
  readonly filterAllCategories: string;
  readonly filterAllSeverities: string;
  readonly filterBlockersOnly: string;
  readonly filterAllRoles: string;
  readonly filterAllTimeframes: string;
  readonly crawlFormTitle: string;
  readonly crawlUrlLabel: string;
  readonly crawlAllowLocalLabel: string;
  readonly crawlStartButton: string;
  readonly comparatorTitle: string;
  readonly colCodeValues: string;
  readonly colCrawlValues: string;
  readonly colDivergences: string;
  readonly statusConsistent: string;
  readonly decisionsTitle: string;
  readonly decisionTitleLabel: string;
  readonly decisionRationaleLabel: string;
  readonly decisionSubmitButton: string;
  readonly reportsTitle: string;
  readonly reportFormatLabel: string;
  readonly reportExportButton: string;
  readonly patchesTitle: string;
  readonly patchesProposeButton: string;
  readonly patchesDiffTitle: string;
  readonly patchesBackupLabel: string;
  readonly patchesNoBatches: string;
  readonly patchesBatchId: string;
  readonly patchesTimestamp: string;
  readonly patchesProposals: string;
  readonly patchesSkipped: string;
  readonly patchesApplied: string;
  readonly patchesTodoSeoCount: string;
  readonly patchesRuleIds: string;
  readonly patchesViewDiff: string;
  readonly emptyStateMessage: string;
  readonly blockerBadge: string;
}

const FR_DICT: DashboardDictionary = {
  brandSubtitle: 'Copilote SEO local et confidentiel — Audit automatisé, détection d’anomalies et correctifs guidés',
  navLabel: 'Navigation principale du tableau de bord SEO',
  langLabel: 'Langue de l’interface',
  tabOverview: '1. Vue d’ensemble',
  tabRoutes: '2. Pages & URLs',
  tabFindings: '3. Anomalies détectées (44 règles)',
  tabBacklog: '4. Actions prioritaires',
  tabCrawl: '5. Code vs. Rendu en ligne',
  tabDecisions: '6. Journal des décisions',
  tabPatches: '7. Correctifs de code',
  kpiRoutes: 'Pages analysées',
  kpiFiles: 'Fichiers sources',
  kpiBlockers: 'Blocages critiques d’indexation',
  kpiFindings: 'Total des anomalies',
  kpiDecisions: 'Décisions validées',
  btnScanAudit: 'Lancer une nouvelle analyse complète',
  severityBreakdownTitle: 'Anomalies par niveau d’urgence',
  categoryBreakdownTitle: 'Anomalies par catégorie SEO (44 règles)',
  latestCrawlTitle: 'Dernière exploration du site en ligne',
  noCrawlYet: 'Aucune exploration en ligne effectuée pour le moment. Vous pouvez tester une URL dans l’onglet « Code vs. Rendu en ligne ».',
  searchPlaceholder: 'Rechercher une page par URL, titre, balise meta ou contenu...',
  searchButton: 'Rechercher',
  colRoute: 'Page (URL)',
  colRouter: 'Technologie',
  colTitle: 'Titre SEO (Title)',
  colH1: 'Titre principal (H1)',
  colLang: 'Langue',
  colSitemap: 'Dans le sitemap',
  colRule: 'Règle SEO',
  colSeverity: 'Niveau d’urgence',
  colSubject: 'Élément concerné',
  colEvidence: 'Localisation exacte',
  colRemediation: 'Solution recommandée',
  colIceScore: 'Priorité ICE (Impact / Facilité)',
  colOwner: 'Responsable',
  colTimeframe: 'Délai recommandé',
  colKpi: 'Bénéfice attendu',
  filterAllCategories: 'Toutes les catégories',
  filterAllSeverities: 'Tous les niveaux d’urgence',
  filterBlockersOnly: 'Blocages critiques uniquement',
  filterAllRoles: 'Tous les profils',
  filterAllTimeframes: 'Tous les délais',
  crawlFormTitle: 'Explorer une page ou un site (Crawl en direct)',
  crawlUrlLabel: 'Adresse URL à explorer (ex : http://localhost:3000 ou https://monsite.fr)',
  crawlAllowLocalLabel: 'Autoriser les adresses locales de développement (localhost, 127.0.0.1)',
  crawlStartButton: 'Lancer l’exploration en direct',
  comparatorTitle: 'Comparaison directe : Ce que contient le code vs. Ce que voit Google',
  colCodeValues: 'Code source du projet',
  colCrawlValues: 'Page rendue en ligne',
  colDivergences: 'Différences détectées',
  statusConsistent: 'Parfaitement conforme (aucun écart)',
  decisionsTitle: 'Historique des choix d’architecture SEO',
  decisionTitleLabel: 'Intitulé du choix',
  decisionRationaleLabel: 'Explication / Justification produit',
  decisionSubmitButton: 'Enregistrer ce choix',
  reportsTitle: 'Exporter un rapport d’audit',
  reportFormatLabel: 'Format du document',
  reportExportButton: 'Télécharger le rapport',
  patchesTitle: 'Correctifs automatiques prêts à l’emploi',
  patchesProposeButton: 'Générer les correctifs automatiques',
  patchesDiffTitle: 'Aperçu des modifications',
  patchesBackupLabel: 'Dossier de sauvegarde',
  patchesNoBatches: 'Aucun correctif en attente. Cliquez sur « Générer les correctifs automatiques » pour préparer les modifications en toute sécurité.',
  patchesBatchId: 'Numéro du lot',
  patchesTimestamp: 'Date de génération',
  patchesProposals: 'Modifications prêtes',
  patchesSkipped: 'Ignorées',
  patchesApplied: 'Statut',
  patchesTodoSeoCount: 'Points à vérifier manuellement',
  patchesRuleIds: 'Règles corrigées',
  patchesViewDiff: 'Voir les modifications',
  emptyStateMessage: 'Aucun élément ne correspond aux filtres sélectionnés.',
  blockerBadge: 'CRITIQUE',
};

const EN_DICT: DashboardDictionary = {
  brandSubtitle: 'DETERMINISTIC LOCAL DASHBOARD — 127.0.0.1 LOOPBACK ONLY',
  navLabel: 'Main SEO dashboard navigation',
  langLabel: 'Interface language',
  tabOverview: '1. KPI Overview',
  tabRoutes: '2. Routes & FTS5 Search',
  tabFindings: '3. Findings (40 Rules)',
  tabBacklog: '4. ICE Backlog (F-R3)',
  tabCrawl: '5. Code vs. Crawl Comparator',
  tabDecisions: '6. Decisions & Reports',
  tabPatches: '7. Automated Patches',
  kpiRoutes: 'Discovered Routes',
  kpiFiles: 'Scanned Files',
  kpiBlockers: 'Indexing Blockers (F-R3)',
  kpiFindings: 'Total Findings',
  kpiDecisions: 'Architecture Decisions',
  btnScanAudit: 'Run Incremental Scan & Audit',
  severityBreakdownTitle: 'Breakdown by Severity',
  categoryBreakdownTitle: 'Breakdown by Category (40 Rules)',
  latestCrawlTitle: 'Latest HTTP Crawl Session',
  noCrawlYet: 'No HTTP crawl recorded yet. Use the Comparator tab to trigger a crawl.',
  searchPlaceholder: 'Search by URL, title, description, or H1-H6 (FTS5 < 100 ms)...',
  searchButton: 'Search',
  colRoute: 'Route',
  colRouter: 'Framework',
  colTitle: 'Title Tag',
  colH1: 'Primary H1',
  colLang: 'Lang',
  colSitemap: 'Sitemap',
  colRule: 'Rule',
  colSeverity: 'Severity',
  colSubject: 'Subject',
  colEvidence: 'Exact Evidence (File:Line or URL)',
  colRemediation: 'Remediation & Official Source',
  colIceScore: 'ICE Score (I / C / E)',
  colOwner: 'Owner',
  colTimeframe: 'Timeframe',
  colKpi: 'Target KPI',
  filterAllCategories: 'All categories',
  filterAllSeverities: 'All severities',
  filterBlockersOnly: 'Indexing blockers only (F-R3)',
  filterAllRoles: 'All roles',
  filterAllTimeframes: 'All timeframes',
  crawlFormTitle: 'Trigger Anti-SSRF HTTP Crawl',
  crawlUrlLabel: 'Start URL (e.g. http://my-app.test or https://example.com)',
  crawlAllowLocalLabel: 'Allow local server (--allow-local for Laragon / 127.0.0.1)',
  crawlStartButton: 'Start Crawl & Re-audit',
  comparatorTitle: 'Side-by-Side Comparison: Static Source Code vs. Rendered HTTP',
  colCodeValues: 'Source Code (AST / Template Scan)',
  colCrawlValues: 'HTTP Rendered (Crawler)',
  colDivergences: 'Detected Divergences',
  statusConsistent: 'Consistent (0 divergence)',
  decisionsTitle: 'SEO Architectural Decisions Log (.seo/decisions.md)',
  decisionTitleLabel: 'Decision title',
  decisionRationaleLabel: 'Technical or product rationale',
  decisionSubmitButton: 'Record Decision',
  reportsTitle: '5-Section Executive Report Export',
  reportFormatLabel: 'Export format',
  reportExportButton: 'Generate & Download Report',
  patchesTitle: 'Deterministic Remediation & Unified Patches (.seo/patches/)',
  patchesProposeButton: 'Propose patches',
  patchesDiffTitle: 'Unified diff',
  patchesBackupLabel: 'Backup directory',
  patchesNoBatches: 'No patch batches available. Click "Propose patches" to generate a verifiable proposal.',
  patchesBatchId: 'Batch ID',
  patchesTimestamp: 'Date & Time',
  patchesProposals: 'Proposals',
  patchesSkipped: 'Skipped',
  patchesApplied: 'Applied',
  patchesTodoSeoCount: 'TODO-SEO markers',
  patchesRuleIds: 'Touched rules',
  patchesViewDiff: 'View diff',
  emptyStateMessage: 'No data matches the current filters.',
  blockerBadge: 'BLOCKER',
};

export function getDashboardDictionary(lang: SupportedLanguage): DashboardDictionary {
  return lang === 'fr' ? FR_DICT : EN_DICT;
}

export function getRouterKindLabel(kind: string): string {
  switch (kind) {
    case 'astro':
      return 'Astro';
    case 'nuxt':
      return 'Nuxt 3';
    case 'sveltekit':
      return 'SvelteKit';
    case 'remix':
      return 'Remix / RRv7';
    case 'django':
      return 'Django';
    case 'nextjs-app':
      return 'Next.js App';
    case 'nextjs-pages':
      return 'Next.js Pages';
    case 'laravel':
      return 'Laravel';
    case 'symfony':
      return 'Symfony';
    case 'php':
      return 'PHP';
    case 'static-html':
      return 'Static HTML';
    case 'markdown':
      return 'Markdown';
    default:
      return kind;
  }
}

