import type { EditorialTopicCluster, SatelliteBrief } from '@seo-partner/core';

export interface BlogAuditResult {
  hasBlog: boolean;
  blogRoutes: string[];
  recommendation: string;
}

export function detectBlogPresence(routes: string[]): BlogAuditResult {
  const blogRoutes = routes.filter((r) =>
    r.startsWith('/blog') ||
    r.startsWith('/articles') ||
    r.startsWith('/actualites') ||
    r.startsWith('/news'),
  );

  const hasBlog = blogRoutes.length > 0;
  const recommendation = hasBlog
    ? 'Section éditoriale détectée. Optimisation du maillage interne recommandée.'
    : 'Absence de section éditoriale détectée. Création recommandée d\'une section blog et d\'un cocon sémantique pour capter le trafic informationnel.';

  return {
    hasBlog,
    blogRoutes,
    recommendation,
  };
}

export interface TopicClusterOptions {
  domainNiche: string;
  targetAudience?: string;
  coreKeyword?: string;
}

export function generateTopicCluster(options: TopicClusterOptions): EditorialTopicCluster {
  const { domainNiche, targetAudience = 'Professionnels et entreprises' } = options;

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const pillarSlug = `guide-${slugify(domainNiche)}`;
  const pillarPageUrl = `/blog/${pillarSlug}`;

  const defaultSatellites: Array<{
    title: string;
    keyword: string;
    intent: string;
    summary: string;
    words: number;
  }> = [
    {
      title: `Comment réussir votre transition : ${domainNiche}`,
      keyword: `guide pratique ${domainNiche.toLowerCase()}`,
      intent: 'informationnel',
      summary: `Méthodologie détaillée étape par étape pour appréhender ${domainNiche} avec succès pour ${targetAudience}.`,
      words: 1500,
    },
    {
      title: `Les erreurs majeures à éviter concernant ${domainNiche}`,
      keyword: `pièges et erreurs ${domainNiche.toLowerCase()}`,
      intent: 'informationnel / prévention',
      summary: `Analyse des pièges courants et recommandations techniques pour sécuriser vos démarches.`,
      words: 1200,
    },
    {
      title: `Comparatif des solutions et outils adaptés à ${domainNiche}`,
      keyword: `meilleures solutions ${domainNiche.toLowerCase()}`,
      intent: 'commercial',
      summary: `Grille d'évaluation des solutions logicielles et critères de sélection clés pour les décideurs.`,
      words: 1800,
    },
    {
      title: `Cadre réglementaire et conformité : tout comprendre`,
      keyword: `réglementation ${domainNiche.toLowerCase()}`,
      intent: 'informationnel',
      summary: `Décryptage des normes légales et obligations d'application pour rester parfaitement conforme.`,
      words: 1400,
    },
    {
      title: `Rentabilité et ROI : calculer l'impact de votre investissement`,
      keyword: `roi investissement ${domainNiche.toLowerCase()}`,
      intent: 'commercial / décision',
      summary: `Modélisation financière et indicateurs de performance pour mesurer les gains de productivité réels.`,
      words: 1300,
    },
    {
      title: `Cas client concret : retour d'expérience et résultats observés`,
      keyword: `retour experience cas client ${domainNiche.toLowerCase()}`,
      intent: 'navigationnel / preuve',
      summary: `Étude de cas détaillée illustrant les résultats concrets obtenus après déploiement.`,
      words: 1100,
    },
  ];

  const satellites: SatelliteBrief[] = defaultSatellites.map((s) => ({
    slug: slugify(s.title),
    title: s.title,
    targetKeyword: s.keyword,
    searchIntent: s.intent,
    summary: s.summary,
    wordCountTarget: s.words,
  }));

  const internalLinkingPlan = satellites.map((s) => ({
    source: `/blog/${s.slug}`,
    target: pillarPageUrl,
    anchorText: s.title,
  }));

  return {
    id: `cluster_${Date.now()}`,
    coreTheme: domainNiche,
    pillarPageUrl,
    satelliteTopics: satellites,
    internalLinkingPlan,
  };
}
