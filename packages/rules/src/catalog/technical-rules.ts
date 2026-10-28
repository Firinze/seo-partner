import type {
  CrawlPage,
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
  readonly crawlPages?: ReadonlyArray<CrawlPage>;
  readonly robotsTxtContent?: string | null;
  readonly robotsFilePath?: string | null;
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

export const RULE_TECH_07: RuleDefinition = {
  id: 'R-TECH-07',
  category: 'technical',
  defaultSeverity: 'critical',
  blocksIndexing: true,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/http-network-errors',
  title: {
    en: 'Public page returning HTTP 4xx or 5xx error during crawl',
    fr: 'Page publique retournant une erreur HTTP 4xx ou 5xx au crawl',
  },
  defaultIce: {
    impact: 10,
    confidence: 10,
    effort: 8,
    rationale: {
      en: 'HTTP 4xx/5xx responses prevent indexing and drop existing rankings immediately.',
      fr: 'Les erreurs HTTP 4xx/5xx empêchent l indexation et provoquent une désindexation rapide.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '0 HTTP 4xx/5xx responses on public crawled URLs',
    fr: '0 réponse HTTP 4xx/5xx sur les URLs publiques crawlées',
  },
};

export const RULE_TECH_08: RuleDefinition = {
  id: 'R-TECH-08',
  category: 'technical',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/301-redirects',
  title: {
    en: 'Excessive redirect chain (>= 2 hops) or redirect loop',
    fr: 'Chaîne de redirections excessive (>= 2 sauts) ou boucle de redirection',
  },
  defaultIce: {
    impact: 8,
    confidence: 10,
    effort: 8,
    rationale: {
      en: 'Multi-hop redirect chains add latency and waste crawl budget.',
      fr: 'Les chaînes de redirections à sauts multiples dégradent le TTFB et gaspillent le budget de crawl.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: 'All redirects resolve in a single 301/308 hop',
    fr: 'Toutes les redirections aboutissent en un seul saut 301/308',
  },
};

export const RULE_TECH_09: RuleDefinition = {
  id: 'R-TECH-09',
  category: 'technical',
  defaultSeverity: 'critical',
  blocksIndexing: true,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag',
  title: {
    en: 'HTTP X-Robots-Tag: noindex header served on public page',
    fr: 'En-tête HTTP X-Robots-Tag: noindex servi sur une page publique',
  },
  defaultIce: {
    impact: 10,
    confidence: 10,
    effort: 9,
    rationale: {
      en: 'An HTTP X-Robots-Tag: noindex header blocks indexing even when HTML meta tags look clean.',
      fr: 'Un en-tête HTTP X-Robots-Tag: noindex bloque l indexation même si le HTML semble conforme.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '0 public pages serving X-Robots-Tag: noindex in production',
    fr: '0 page publique servant X-Robots-Tag: noindex en production',
  },
};

export const RULE_TECH_10: RuleDefinition = {
  id: 'R-TECH-10',
  category: 'technical',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  title: {
    en: 'Canonical URL contradiction between source code and crawled HTML/headers',
    fr: 'Contradiction d URL canonique entre le code source et le HTML/en-tête crawlé',
  },
  defaultIce: {
    impact: 8,
    confidence: 9,
    effort: 7,
    rationale: {
      en: 'Conflicting canonical signals cause search engines to ignore the declared canonical URL.',
      fr: 'Des signaux canoniques contradictoires conduisent Google à ignorer la canonique déclarée.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '100% match between source canonical and rendered canonical',
    fr: '100 % de concordance entre la canonique du code et celle du rendu HTTP',
  },
};

export const RULE_TECH_11: RuleDefinition = {
  id: 'R-TECH-11',
  category: 'technical',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
  title: {
    en: 'Broken internal link pointing to a non-existent or 4xx route',
    fr: 'Lien interne cassé pointant vers une route inexistante ou en erreur 4xx',
  },
  defaultIce: {
    impact: 8,
    confidence: 10,
    effort: 8,
    rationale: {
      en: 'Broken internal links harm user navigation and dissipate internal PageRank.',
      fr: 'Les liens internes cassés nuisent à l expérience utilisateur et dissipent le maillage interne.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '0 broken internal links across all public pages',
    fr: '0 lien interne cassé sur l ensemble des pages publiques',
  },
};

export const RULE_TECH_12: RuleDefinition = {
  id: 'R-TECH-12',
  category: 'technical',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview',
  title: {
    en: 'Orphan public page (no incoming internal link and not in sitemap)',
    fr: 'Page publique orpheline (aucun lien interne entrant ni présence dans le sitemap)',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 7,
    rationale: {
      en: 'Orphan pages cannot be discovered via internal crawling and receive zero internal link equity.',
      fr: 'Les pages orphelines sont indétectables par le crawl interne et ne reçoivent aucune autorité interne.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: 'Every public page has >= 1 incoming internal link and sitemap entry',
    fr: 'Chaque page publique reçoit au moins 1 lien interne entrant et figure au sitemap',
  },
};

export const RULE_TECH_13: RuleDefinition = {
  id: 'R-TECH-13',
  category: 'technical',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
  title: {
    en: 'Excessive click depth (> 3 clicks from home page)',
    fr: 'Profondeur de clic excessive (> 3 clics depuis la page d accueil)',
  },
  defaultIce: {
    impact: 6,
    confidence: 9,
    effort: 6,
    rationale: {
      en: 'Pages buried deeper than 3 clicks are crawled less frequently and receive weaker internal authority.',
      fr: 'Les pages situées à plus de 3 clics de l accueil sont moins souvent crawlées et moins bien valorisées.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'All strategic public pages reachable in <= 3 clicks',
    fr: 'Toutes les pages publiques stratégiques accessibles en 3 clics maximum',
  },
};

export const RULE_TECH_14: RuleDefinition = {
  id: 'R-TECH-14',
  category: 'technical',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
  title: {
    en: 'Missing or empty lang attribute on <html> element',
    fr: 'Attribut lang manquant ou vide sur la balise <html>',
  },
  defaultIce: {
    impact: 6,
    confidence: 10,
    effort: 9,
    rationale: {
      en: 'Declares document language for accessibility (WCAG 3.1.1) and international search targeting.',
      fr: 'Déclare la langue du document pour l accessibilité (WCAG 3.1.1) et l indexation linguistique.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '100% of HTML documents declare a valid BCP 47 lang attribute on <html>',
    fr: '100 % des documents HTML déclarent un attribut lang valide sur <html>',
  },
};

export const TECHNICAL_RULES_V01: ReadonlyArray<RuleDefinition> = [
  RULE_TECH_01,
  RULE_TECH_02,
  RULE_TECH_03,
  RULE_TECH_04,
  RULE_TECH_05,
  RULE_TECH_06,
];

export const TECHNICAL_RULES: ReadonlyArray<RuleDefinition> = [
  ...TECHNICAL_RULES_V01,
  RULE_TECH_07,
  RULE_TECH_08,
  RULE_TECH_09,
  RULE_TECH_10,
  RULE_TECH_11,
  RULE_TECH_12,
  RULE_TECH_13,
  RULE_TECH_14,
];

function extractPathnameSafe(rawUrlOrPath: string): string {
  const trimmed = rawUrlOrPath.trim();
  if (trimmed.startsWith('/')) {
    const noQuery = trimmed.split('?')[0]?.split('#')[0] ?? '/';
    return noQuery.length > 1 && noQuery.endsWith('/') ? noQuery.slice(0, -1) : noQuery;
  }
  try {
    const u = new URL(trimmed);
    const p = u.pathname || '/';
    return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
  } catch {
    return trimmed;
  }
}

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

  // Build incoming internal link graph across scanned routes
  const incomingLinksByPattern = new Map<string, number>();
  for (const item of ctx.routes) {
    for (const link of item.links) {
      if (link.kind === 'internal') {
        const targetPattern = extractPathnameSafe(link.toUrl);
        incomingLinksByPattern.set(
          targetPattern,
          (incomingLinksByPattern.get(targetPattern) ?? 0) + 1,
        );
      }
    }
  }

  const crawlByPattern = new Map<string, CrawlPage>();
  if (ctx.crawlPages) {
    for (const cp of ctx.crawlPages) {
      crawlByPattern.set(cp.routePattern, cp);
    }
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

    // R-TECH-12: Orphan public page (not '/', not in sitemap, and 0 incoming internal links)
    if (
      !route.isPrivate &&
      route.pattern !== '/' &&
      !route.inSitemap &&
      (incomingLinksByPattern.get(route.pattern) ?? 0) === 0 &&
      ctx.routes.length > 1
    ) {
      findings.push(
        createFindingFromRule(RULE_TECH_12, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: 1,
            observed: `Route "${route.pattern}" has 0 incoming internal links and is absent from sitemap`,
            expected: 'At least 1 incoming internal link and presence in sitemap.xml',
          },
          remediation: {
            en: `Add internal links pointing to ${route.pattern} and include it in sitemap.xml.`,
            fr: `Ajouter des liens internes vers ${route.pattern} et l inclure dans sitemap.xml.`,
          },
        }),
      );
    }

    // R-TECH-14: Missing or empty lang attribute on <html> in scanned code
    if (
      !route.isPrivate &&
      item.htmlLang !== undefined &&
      (item.htmlLang === null || item.htmlLang.value.trim().length === 0)
    ) {
      const lineNum = item.htmlLang?.line ?? 1;
      findings.push(
        createFindingFromRule(RULE_TECH_14, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: lineNum,
            observed: '<html> tag is missing a non-empty lang attribute',
            expected: '<html lang="fr"> or <html lang="en">',
          },
          remediation: {
            en: `Add a valid BCP 47 lang attribute on <html> in ${route.filePath}:${lineNum}.`,
            fr: `Ajouter un attribut lang valide sur la balise <html> dans ${route.filePath}:${lineNum}.`,
          },
        }),
      );
    }

    // R-TECH-10: Canonical contradiction between code and crawled page
    const crawled = crawlByPattern.get(route.pattern);
    if (!route.isPrivate && item.canonical && crawled) {
      const renderedCanonical = crawled.httpCanonical ?? crawled.canonical;
      if (renderedCanonical) {
        const codePath = extractPathnameSafe(item.canonical.value);
        const renderedPath = extractPathnameSafe(renderedCanonical);
        if (codePath !== renderedPath) {
          findings.push(
            createFindingFromRule(RULE_TECH_10, {
              subjectRef: route.pattern,
              evidence: {
                source: 'code-vs-crawl',
                filePath: route.filePath,
                lineNumber: item.canonical.line,
                url: crawled.url,
                statusCode: crawled.statusCode,
                observed: `Code canonical "${item.canonical.value}" != rendered canonical "${renderedCanonical}"`,
                expected: 'Identical canonical URL between source code and HTTP response',
              },
              remediation: {
                en: `Align canonical URL in ${route.filePath}:${item.canonical.line} with the HTTP rendered canonical (${renderedCanonical}).`,
                fr: `Aligner l URL canonique de ${route.filePath}:${item.canonical.line} avec celle servie au crawl (${renderedCanonical}).`,
              },
            }),
          );
        }
      }
    }
  }

  // Evaluate CrawlPage-based technical rules (R-TECH-07, R-TECH-08, R-TECH-09, R-TECH-11, R-TECH-13, R-TECH-14)
  if (ctx.crawlPages) {
    const routeByPattern = new Map<string, ExtractedRouteData>();
    for (const r of ctx.routes) {
      routeByPattern.set(r.route.pattern, r);
    }

    for (const cp of ctx.crawlPages) {
      const matchedRoute = routeByPattern.get(cp.routePattern);
      const filePath = matchedRoute?.route.filePath ?? cp.url;

      // R-TECH-07: HTTP 4xx / 5xx
      if (cp.statusCode >= 400) {
        findings.push(
          createFindingFromRule(RULE_TECH_07, {
            subjectRef: cp.routePattern,
            evidence: {
              source: 'http-crawl',
              filePath,
              lineNumber: 1,
              url: cp.url,
              statusCode: cp.statusCode,
              observed: `HTTP ${cp.statusCode} returned on ${cp.url}`,
              expected: 'HTTP 200 OK',
            },
            remediation: {
              en: `Fix the HTTP ${cp.statusCode} error on ${cp.url} or update links pointing to it.`,
              fr: `Corriger l erreur HTTP ${cp.statusCode} sur ${cp.url} ou mettre à jour les liens entrants.`,
            },
          }),
        );
      }

      // R-TECH-08: Redirect chain >= 2 hops
      if (cp.redirectChain.length >= 2) {
        const chainSummary = cp.redirectChain
          .map((h) => `${h.status} ${h.from} -> ${h.to}`)
          .join(' | ');
        findings.push(
          createFindingFromRule(RULE_TECH_08, {
            subjectRef: cp.routePattern,
            evidence: {
              source: 'http-crawl',
              filePath,
              lineNumber: 1,
              url: cp.url,
              statusCode: cp.statusCode,
              observed: `${cp.redirectChain.length} redirect hops (${chainSummary})`,
              expected: 'Maximum 1 direct 301/308 redirect hop',
            },
            remediation: {
              en: `Point ${cp.url} directly to its final destination URL in a single 301/308 hop.`,
              fr: `Rediriger ${cp.url} directement vers sa destination finale en un seul saut 301/308.`,
            },
          }),
        );
      }

      // R-TECH-09: HTTP X-Robots-Tag: noindex
      if (cp.xRobotsTag && /\bnoindex\b/i.test(cp.xRobotsTag)) {
        findings.push(
          createFindingFromRule(RULE_TECH_09, {
            subjectRef: cp.routePattern,
            evidence: {
              source: 'http-crawl',
              filePath,
              lineNumber: 1,
              url: cp.url,
              statusCode: cp.statusCode,
              observed: `X-Robots-Tag: "${cp.xRobotsTag}"`,
              expected: 'No X-Robots-Tag: noindex header on public pages',
            },
            remediation: {
              en: `Remove the X-Robots-Tag: noindex HTTP response header on ${cp.url}.`,
              fr: `Supprimer l en-tête HTTP X-Robots-Tag: noindex servi sur ${cp.url}.`,
            },
          }),
        );
      }

      // R-TECH-11: Broken internal links discovered on crawled page
      for (const brokenUrl of cp.brokenLinks) {
        findings.push(
          createFindingFromRule(RULE_TECH_11, {
            subjectRef: `${cp.routePattern}->${extractPathnameSafe(brokenUrl)}`,
            evidence: {
              source: 'http-crawl',
              filePath,
              lineNumber: 1,
              url: cp.url,
              statusCode: cp.statusCode,
              observed: `Page ${cp.url} contains broken internal link to ${brokenUrl}`,
              expected: 'All internal links resolve to HTTP 200',
            },
            remediation: {
              en: `Update or remove the broken internal link to ${brokenUrl} on ${cp.url}.`,
              fr: `Mettre à jour ou retirer le lien interne cassé vers ${brokenUrl} sur ${cp.url}.`,
            },
          }),
        );
      }

      // R-TECH-13: Click depth > 3
      if (cp.depth > 3) {
        findings.push(
          createFindingFromRule(RULE_TECH_13, {
            subjectRef: cp.routePattern,
            evidence: {
              source: 'http-crawl',
              filePath,
              lineNumber: 1,
              url: cp.url,
              statusCode: cp.statusCode,
              observed: `Click depth is ${cp.depth} clicks from start URL`,
              expected: 'Click depth <= 3 from home page',
            },
            remediation: {
              en: `Reduce click depth of ${cp.routePattern} (currently ${cp.depth}) by linking it from category or hub pages.`,
              fr: `Réduire la profondeur de clic de ${cp.routePattern} (actuellement ${cp.depth}) via un maillage depuis les pages hubs.`,
            },
          }),
        );
      }

      // R-TECH-14 on crawled page if not already caught by code scan
      if (
        cp.statusCode >= 200 &&
        cp.statusCode < 300 &&
        (!cp.htmlLang || cp.htmlLang.trim().length === 0) &&
        matchedRoute?.htmlLang === undefined
      ) {
        findings.push(
          createFindingFromRule(RULE_TECH_14, {
            subjectRef: cp.routePattern,
            evidence: {
              source: 'http-crawl',
              filePath,
              lineNumber: 1,
              url: cp.url,
              statusCode: cp.statusCode,
              observed: 'Rendered <html> tag is missing lang attribute',
              expected: '<html lang="fr"> or <html lang="en">',
            },
            remediation: {
              en: `Add a valid lang attribute to the root <html> element on ${cp.url}.`,
              fr: `Ajouter un attribut lang valide sur l élément racine <html> de ${cp.url}.`,
            },
          }),
        );
      }
    }
  }

  return findings;
}
