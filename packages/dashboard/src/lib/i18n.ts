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
  brandSubtitle: 'DASHBOARD LOCAL DETERMINISTE — 127.0.0.1 UNIQUEMENT',
  navLabel: 'Navigation principale du tableau de bord SEO',
  langLabel: 'Langue de l interface',
  tabOverview: '1. Synthese KPI',
  tabRoutes: '2. Routes & Recherche FTS5',
  tabFindings: '3. Constats (40 Regles)',
  tabBacklog: '4. Backlog ICE (F-R3)',
  tabCrawl: '5. Comparateur Code vs. Crawl',
  tabDecisions: '6. Decisions & Rapports',
  tabPatches: '7. Correctifs Automatiques',
  kpiRoutes: 'Routes Decouvertes',
  kpiFiles: 'Fichiers Scannes',
  kpiBlockers: 'Bloquants Indexation (F-R3)',
  kpiFindings: 'Constats Totaux',
  kpiDecisions: 'Decisions Architecture',
  btnScanAudit: 'Relancer Scan Incremental & Audit',
  severityBreakdownTitle: 'Repartition par Severite',
  categoryBreakdownTitle: 'Repartition par Categorie (40 Regles)',
  latestCrawlTitle: 'Derniere Session de Crawl HTTP',
  noCrawlYet: 'Aucun crawl HTTP enregistre. Utilisez l onglet Comparateur pour lancer un crawl.',
  searchPlaceholder: 'Rechercher par URL, title, description ou H1-H6 (FTS5 < 100 ms)...',
  searchButton: 'Rechercher',
  colRoute: 'Route',
  colRouter: 'Framework',
  colTitle: 'Balise Title',
  colH1: 'Premier H1',
  colLang: 'Lang',
  colSitemap: 'Sitemap',
  colRule: 'Regle',
  colSeverity: 'Severite',
  colSubject: 'Cible',
  colEvidence: 'Preuve Exacte (Fichier:Ligne ou URL)',
  colRemediation: 'Correctif & Source Officielle',
  colIceScore: 'Score ICE (I / C / E)',
  colOwner: 'Role',
  colTimeframe: 'Horizon',
  colKpi: 'KPI Attendu',
  filterAllCategories: 'Toutes les categories',
  filterAllSeverities: 'Toutes les severites',
  filterBlockersOnly: 'Bloquants indexation uniquement (F-R3)',
  filterAllRoles: 'Tous les roles',
  filterAllTimeframes: 'Tous les horizons',
  crawlFormTitle: 'Lancer un Crawl HTTP Anti-SSRF',
  crawlUrlLabel: 'URL de depart (ex. http://mon-projet.test ou https://example.com)',
  crawlAllowLocalLabel: 'Autoriser serveur local (--allow-local pour Laragon / 127.0.0.1)',
  crawlStartButton: 'Demarrer le Crawl & Re-auditer',
  comparatorTitle: 'Comparaison Cote a Cote : Code Source Statique vs. Rendu HTTP',
  colCodeValues: 'Code Source (Scan AST / Template)',
  colCrawlValues: 'Rendu HTTP (Crawler)',
  colDivergences: 'Ecarts Detectes',
  statusConsistent: 'Conforme (0 ecart)',
  decisionsTitle: 'Journal des Decisions Architecturales SEO (.seo/decisions.md)',
  decisionTitleLabel: 'Titre de la decision',
  decisionRationaleLabel: 'Justification technique ou produit',
  decisionSubmitButton: 'Enregistrer la Decision',
  reportsTitle: 'Export de Rapports Executifs 5 Parties',
  reportFormatLabel: 'Format d export',
  reportExportButton: 'Generer & Telecharger le Rapport',
  patchesTitle: 'Remediation Deterministe & Patchs Unifies (.seo/patches/)',
  patchesProposeButton: 'Proposer des correctifs',
  patchesDiffTitle: 'Diff unifie',
  patchesBackupLabel: 'Dossier de sauvegarde',
  patchesNoBatches: 'Aucun lot de correctifs disponible. Cliquez sur "Proposer des correctifs" pour generer une proposition verifiable.',
  patchesBatchId: 'Identifiant du lot',
  patchesTimestamp: 'Date & Heure',
  patchesProposals: 'Propositions',
  patchesSkipped: 'Ignores',
  patchesApplied: 'Applique',
  patchesTodoSeoCount: 'Marqueurs TODO-SEO',
  patchesRuleIds: 'Regles concernees',
  patchesViewDiff: 'Afficher le diff',
  emptyStateMessage: 'Aucune donnee a afficher pour les filtres actuels.',
  blockerBadge: 'BLOQUANT',
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

