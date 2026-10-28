import type {
  ExtractedRouteData,
  Finding,
  ProjectRecord,
  RuleDefinition,
} from '@seo-partner/core';
import { createFindingFromRule } from '../ice-scorer.js';

export interface AuditContext {
  readonly project: ProjectRecord;
  readonly routes: ReadonlyArray<ExtractedRouteData>;
  readonly sitemapFilePath: string | null;
}

export const RULE_TECH_01: RuleDefinition = {
  id: 'R-TECH-01',
  category: 'technical',
  defaultSeverity: 'critical',
  blocksIndexing: true,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
  title: {
    en: 'Accessible and valid robots.txt',
    fr: 'Fichier robots.txt présent et accessible',
  },
  defaultIce: {
    impact: 8,
    confidence: 10,
    effort: 9,
    rationale: {
      en: 'Controls crawler budget and declares sitemap location; trivial to add.',
      fr: 'Contrôle l exploration par les robots et déclare le sitemap ; très rapide à ajouter.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: 'robots.txt HTTP 200 and parsed in Google Search Console',
    fr: 'robots.txt en HTTP 200 et validé dans Google Search Console',
  },
};

export const RULE_TECH_02: RuleDefinition = {
  id: 'R-TECH-02',
  category: 'technical',
  defaultSeverity: 'high',
  blocksIndexing: true,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview',
  title: {
    en: 'XML Sitemap or dynamic sitemap generator present',
    fr: 'Présence d un sitemap XML ou générateur de sitemap',
  },
  defaultIce: {
    impact: 9,
    confidence: 10,
    effort: 8,
    rationale: {
      en: 'Accelerates discovery of all canonical public pages.',
      fr: 'Accélère la découverte et l indexation des pages publiques canoniques.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: 'Sitemap submitted in Search Console with 0 errors',
    fr: 'Sitemap soumis dans Search Console avec 0 erreur',
  },
};

export const RULE_TECH_03: RuleDefinition = {
  id: 'R-TECH-03',
  category: 'technical',
  defaultSeverity: 'critical',
  blocksIndexing: true,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
  title: {
    en: 'No accidental noindex directive on public pages',
    fr: 'Absence de directive noindex accidentelle sur les pages publiques',
  },
  defaultIce: {
    impact: 10,
    confidence: 10,
    effort: 10,
    rationale: {
      en: 'A noindex directive completely removes the page from search results; 1-line fix.',
      fr: 'Un noindex exclut totalement la page de Google ; correctif d une ligne.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '100% of public pages indexable in URL Inspection',
    fr: '100 % des pages publiques indexables dans l inspection d URL',
  },
};

export const RULE_TECH_04: RuleDefinition = {
  id: 'R-TECH-04',
  category: 'technical',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap',
  title: {
    en: 'Private routes excluded from sitemap',
    fr: 'Exclusion des pages privées du sitemap',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 9,
    rationale: {
      en: 'Prevents crawl waste and Search Console coverage warnings on auth/admin URLs.',
      fr: 'Évite le gaspillage de budget de crawl et les erreurs de couverture Search Console.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '0 private/admin URLs listed in sitemap.xml',
    fr: '0 URL privée ou d administration présente dans le sitemap',
  },
};

export const RULE_TECH_05: RuleDefinition = {
  id: 'R-TECH-05',
  category: 'technical',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  title: {
    en: 'Explicit canonical URL on every public page',
    fr: 'URL canonique explicite sur chaque page publique',
  },
  defaultIce: {
    impact: 8,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Consolidates ranking signals and prevents duplicate content dilution.',
      fr: 'Consolide les signaux de classement et prévient la dilution par contenu dupliqué.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% of public pages declare an explicit canonical tag',
    fr: '100 % des pages publiques déclarent une balise canonique explicite',
  },
};

export const RULE_TECH_06: RuleDefinition = {
  id: 'R-TECH-06',
  category: 'technical',
  defaultSeverity: 'high',
  blocksIndexing: true,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics',
  title: {
    en: 'Public pages must not be client-only without server metadata',
    fr: 'Absence de page publique rendue uniquement côté client sans métadonnées serveur',
  },
  defaultIce: {
    impact: 9,
    confidence: 9,
    effort: 7,
    rationale: {
      en: 'Client-only pages without SSR metadata delay indexing and break social/AI previews.',
      fr: 'Les pages purement client sans métadonnées SSR pénalisent l indexation et les aperçus IA/sociaux.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: 'All public pages render title, meta, and H1 in initial SSR/SSG HTML',
    fr: 'Toutes les pages publiques servent title, meta et H1 dès le HTML initial',
  },
};

export const TECHNICAL_RULES: ReadonlyArray<RuleDefinition> = [
  RULE_TECH_01,
  RULE_TECH_02,
  RULE_TECH_03,
  RULE_TECH_04,
  RULE_TECH_05,
  RULE_TECH_06,
];

export function evaluateTechnicalRules(ctx: AuditContext): ReadonlyArray<Finding> {
  const findings: Finding[] = [];

  if (!ctx.project.hasRobotsTxt) {
    findings.push(
      createFindingFromRule(RULE_TECH_01, {
        subjectRef: '/robots.txt',
        evidence: {
          source: 'code-scan',
          filePath: 'package.json',
          lineNumber: 1,
          observed: 'No public/robots.txt or app/robots.ts found',
          expected: 'Accessible /robots.txt or app/robots.ts declaring User-agent and Sitemap',
        },
        remediation: {
          en: 'Create public/robots.txt or src/app/robots.ts allowing public routes and referencing sitemap.xml.',
          fr: 'Créer public/robots.txt ou src/app/robots.ts autorisant les routes publiques et déclarant sitemap.xml.',
        },
      }),
    );
  }

  if (!ctx.project.hasSitemap) {
    findings.push(
      createFindingFromRule(RULE_TECH_02, {
        subjectRef: '/sitemap.xml',
        evidence: {
          source: 'code-scan',
          filePath: 'package.json',
          lineNumber: 1,
          observed: 'No public/sitemap.xml or app/sitemap.ts found',
          expected: 'Valid XML sitemap listing all public canonical URLs',
        },
        remediation: {
          en: 'Add src/app/sitemap.ts or public/sitemap.xml listing all canonical public routes.',
          fr: 'Ajouter src/app/sitemap.ts ou public/sitemap.xml listant toutes les routes publiques canoniques.',
        },
      }),
    );
  }

  for (const item of ctx.routes) {
    const { route } = item;

    if (!route.isPrivate && item.robots && /\bnoindex\b/i.test(item.robots.value)) {
      findings.push(
        createFindingFromRule(RULE_TECH_03, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: item.robots.line,
            observed: `robots: "${item.robots.value}"`,
            expected: 'robots: "index, follow" on public route',
          },
          remediation: {
            en: `Remove the noindex directive on public route ${route.pattern} (${route.filePath}:${item.robots.line}).`,
            fr: `Retirer la directive noindex sur la page publique ${route.pattern} (${route.filePath}:${item.robots.line}).`,
          },
        }),
      );
    }

    if (route.isPrivate && route.inSitemap) {
      findings.push(
        createFindingFromRule(RULE_TECH_04, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: ctx.sitemapFilePath ?? route.filePath,
            lineNumber: 1,
            observed: `Private route "${route.pattern}" is included in sitemap`,
            expected: `Private route "${route.pattern}" excluded from sitemap`,
          },
          remediation: {
            en: `Remove private route ${route.pattern} from ${ctx.sitemapFilePath ?? 'sitemap.xml'}.`,
            fr: `Retirer la route privée ${route.pattern} du fichier ${ctx.sitemapFilePath ?? 'sitemap.xml'}.`,
          },
        }),
      );
    }

    if (!route.isPrivate && !item.canonical) {
      findings.push(
        createFindingFromRule(RULE_TECH_05, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: 1,
            observed: 'Missing canonical URL definition',
            expected: `Explicit canonical URL for ${route.pattern}`,
          },
          remediation: {
            en: `Add alternates.canonical (or <link rel="canonical">) in ${route.filePath} for route ${route.pattern}.`,
            fr: `Ajouter alternates.canonical (ou <link rel="canonical">) dans ${route.filePath} pour la route ${route.pattern}.`,
          },
        }),
      );
    }

    if (!route.isPrivate && route.renderingMode === 'client-only' && !item.title) {
      findings.push(
        createFindingFromRule(RULE_TECH_06, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: 1,
            observed: "'use client' route file without server metadata export",
            expected: 'Server Component page.tsx exporting metadata/generateMetadata',
          },
          remediation: {
            en: `Convert ${route.filePath} to a Server Component exporting metadata and move client hooks to a child component.`,
            fr: `Convertir ${route.filePath} en Server Component exportant metadata et déplacer l interactivité client dans un sous-composant.`,
          },
        }),
      );
    }
  }

  return findings;
}

