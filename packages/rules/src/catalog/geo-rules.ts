import type { ExtractedRouteData, Finding, RuleDefinition } from '@seo-partner/core';
import { createFindingFromRule } from '../ice-scorer.js';
import type { AuditContext } from './technical-rules.js';

export const RULE_GEO_01: RuleDefinition = {
  id: 'R-GEO-01',
  category: 'geo',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/specialty/international/localized-versions',
  title: {
    en: 'Valid ISO 639-1 / ISO 3166-1 hreflang language-region codes',
    fr: 'Conformité des codes de langue et région hreflang (ISO 639-1 / ISO 3166-1)',
  },
  defaultIce: {
    impact: 8,
    confidence: 10,
    effort: 8,
    rationale: {
      en: 'Invalid hreflang codes (such as en-UK instead of en-GB) are completely ignored by Google.',
      fr: 'Les codes hreflang invalides (ex. en-UK au lieu de en-GB) sont ignorés par Google.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '100% valid ISO hreflang attributes across localized pages',
    fr: '100 % d attributs hreflang conformes aux normes ISO sur les pages multilingues',
  },
};

export const RULE_GEO_02: RuleDefinition = {
  id: 'R-GEO-02',
  category: 'geo',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/specialty/international/localized-versions',
  title: {
    en: 'Hreflang cluster includes self-referential link and x-default fallback',
    fr: 'Présence du lien auto-référent et de x-default dans les grappes hreflang',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Google requires each localized page to include a self-referencing hreflang and recommends x-default.',
      fr: 'Google exige un lien hreflang auto-référent et recommande x-default pour les sélecteurs de langue.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'Every hreflang cluster includes x-default and self-reference',
    fr: 'Chaque grappe hreflang inclut x-default et une auto-référence',
  },
};

export const RULE_GEO_03: RuleDefinition = {
  id: 'R-GEO-03',
  category: 'geo',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers',
  title: {
    en: 'Explicit crawler policy in robots.txt without unintended full Disallow',
    fr: 'Politique explicite vis-à-vis des robots d indexation et IA dans robots.txt',
  },
  defaultIce: {
    impact: 6,
    confidence: 8,
    effort: 8,
    rationale: {
      en: 'A blanket Disallow: / in robots.txt blocks all search and generative AI visibility.',
      fr: 'Un Disallow: / global dans robots.txt bloque toute visibilité organique et générative (GEO).',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: 'robots.txt explicitly allows public content indexing',
    fr: 'robots.txt autorise explicitement l indexation des contenus publics',
  },
};

export const GEO_RULES: ReadonlyArray<RuleDefinition> = [
  RULE_GEO_01,
  RULE_GEO_02,
  RULE_GEO_03,
];

const VALID_HREFLANG_REGEX = /^(x-default|[a-z]{2,3}(-[A-Z]{2}|-[a-zA-Z]{4})?)$/;
const INVALID_REGION_CODES = new Set(['en-UK', 'en-EU', 'fr-EU']);

export function evaluateGeoRules(
  ctx: AuditContext,
): ReadonlyArray<Finding> {
  const findings: Finding[] = [];
  const routes: ReadonlyArray<ExtractedRouteData> = ctx.routes;

  for (const item of routes) {
    if (item.route.isPrivate) continue;
    if (item.hreflang.length === 0) continue;

    for (const hl of item.hreflang) {
      const code = hl.lang.trim();
      if (!VALID_HREFLANG_REGEX.test(code) || INVALID_REGION_CODES.has(code)) {
        findings.push(
          createFindingFromRule(RULE_GEO_01, {
            subjectRef: `${item.route.pattern}#hreflang:${code}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: 1,
              observed: `Invalid hreflang code "${code}" -> "${hl.url}"`,
              expected: 'Valid ISO 639-1 language code optionally followed by ISO 3166-1 Alpha-2 region (e.g. fr-FR, en-GB, x-default)',
            },
            remediation: {
              en: `Replace invalid hreflang code "${code}" in ${item.route.filePath} with a valid ISO code (e.g. en-GB instead of en-UK).`,
              fr: `Remplacer le code hreflang invalide "${code}" dans ${item.route.filePath} par un code ISO valide (ex. en-GB au lieu de en-UK).`,
            },
          }),
        );
      }
    }

    const hasXDefault = item.hreflang.some((h) => h.lang.trim().toLowerCase() === 'x-default');
    const canonicalUrl = item.canonical?.value.trim();
    const hasSelfRef = canonicalUrl
      ? item.hreflang.some((h) => h.url.trim() === canonicalUrl)
      : item.hreflang.length >= 2;

    if (!hasXDefault || !hasSelfRef) {
      findings.push(
        createFindingFromRule(RULE_GEO_02, {
          subjectRef: item.route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: item.route.filePath,
            lineNumber: 1,
            observed: !hasXDefault
              ? 'Hreflang cluster is missing "x-default" fallback entry'
              : 'Hreflang cluster is missing self-referential link matching canonical URL',
            expected: 'Hreflang set including both self-referential URL and x-default',
          },
          remediation: {
            en: `Include both a self-referential hreflang link and an "x-default" entry in ${item.route.filePath}.`,
            fr: `Inclure un lien hreflang auto-référent ainsi qu une entrée "x-default" dans ${item.route.filePath}.`,
          },
        }),
      );
    }
  }

  // R-GEO-03: Check robotsTxtContent for blanket Disallow: / on User-agent: *
  if (ctx.robotsTxtContent) {
    const normalized = ctx.robotsTxtContent.replace(/\r\n/g, '\n');
    const blocksAll =
      /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(\n|$)/i.test(normalized) &&
      !/Allow:\s*\/[a-z0-9]/i.test(normalized);
    if (blocksAll) {
      findings.push(
        createFindingFromRule(RULE_GEO_03, {
          subjectRef: '/robots.txt',
          evidence: {
            source: 'code-scan',
            filePath: ctx.robotsFilePath ?? 'public/robots.txt',
            lineNumber: 1,
            observed: 'User-agent: * with blanket Disallow: / in robots.txt',
            expected: 'Explicit Allow: / for public routes and controlled bot policies',
          },
          remediation: {
            en: `Update ${ctx.robotsFilePath ?? 'public/robots.txt'} so public pages are not blocked by a global Disallow: /.`,
            fr: `Mettre à jour ${ctx.robotsFilePath ?? 'public/robots.txt'} afin de ne pas bloquer l intégralité du site par Disallow: /.`,
          },
        }),
      );
    }
  }

  return findings;
}

