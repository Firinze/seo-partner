import type { ExtractedRouteData, Finding, RuleDefinition } from '@seo-partner/core';
import { createFindingFromRule } from '../ice-scorer.js';

export const RULE_ONPAGE_01: RuleDefinition = {
  id: 'R-ONPAGE-01',
  category: 'on-page',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  title: {
    en: 'Title tag present on every public page',
    fr: 'Présence d une balise title sur chaque page publique',
  },
  defaultIce: {
    impact: 9,
    confidence: 10,
    effort: 9,
    rationale: {
      en: 'Primary relevance and SERP click signal; very fast to add.',
      fr: 'Signal majeur de pertinence et de clic dans les SERP ; très rapide à renseigner.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: 'immediate',
  kpi: {
    en: '100% of public pages have an explicit title',
    fr: '100 % des pages publiques disposent d un title explicite',
  },
};

export const RULE_ONPAGE_02: RuleDefinition = {
  id: 'R-ONPAGE-02',
  category: 'on-page',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  title: {
    en: 'Unique title tags across all public pages',
    fr: 'Unicité des balises title sur toutes les pages publiques',
  },
  defaultIce: {
    impact: 8,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Eliminates keyword cannibalization and clarifies page intent.',
      fr: 'Élimine la cannibalisation et distingue clairement l intention de chaque page.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: '0 duplicate titles across public routes',
    fr: '0 doublon de title sur les routes publiques',
  },
};

export const RULE_ONPAGE_03: RuleDefinition = {
  id: 'R-ONPAGE-03',
  category: 'on-page',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  title: {
    en: 'Recommended title display length (50–60 characters)',
    fr: 'Longueur recommandée du title (50 à 60 caractères)',
  },
  defaultIce: {
    impact: 5,
    confidence: 7,
    effort: 9,
    rationale: {
      en: 'SERP recommendation (not a hard Google limit) to avoid truncation and improve CTR.',
      fr: 'Recommandation d affichage SERP (et non limite algorithmique) pour éviter la troncature et améliorer le CTR.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: 'Higher organic CTR on optimized title links',
    fr: 'Hausse du CTR organique sur les pages optimisées',
  },
};

export const RULE_ONPAGE_04: RuleDefinition = {
  id: 'R-ONPAGE-04',
  category: 'on-page',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/snippet',
  title: {
    en: 'Meta description present on every public page',
    fr: 'Présence d une meta description sur chaque page publique',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 9,
    rationale: {
      en: 'Controls SERP snippet copy and drives qualified clicks.',
      fr: 'Maîtrise l extrait affiché dans les résultats de recherche et incite au clic qualifié.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% of public pages have a meta description',
    fr: '100 % des pages publiques possèdent une meta description',
  },
};

export const RULE_ONPAGE_05: RuleDefinition = {
  id: 'R-ONPAGE-05',
  category: 'on-page',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/snippet',
  title: {
    en: 'Unique meta descriptions across all public pages',
    fr: 'Unicité des meta descriptions sur toutes les pages publiques',
  },
  defaultIce: {
    impact: 6,
    confidence: 8,
    effort: 8,
    rationale: {
      en: 'Google Search Central explicitly advises against identical descriptions across pages.',
      fr: 'Google Search Central déconseille explicitement les descriptions identiques sur plusieurs pages.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: '0 duplicate meta descriptions across public routes',
    fr: '0 doublon de meta description sur les routes publiques',
  },
};

export const RULE_ONPAGE_06: RuleDefinition = {
  id: 'R-ONPAGE-06',
  category: 'on-page',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/snippet',
  title: {
    en: 'Recommended meta description length (150–160 characters)',
    fr: 'Longueur recommandée de la meta description (150 à 160 caractères)',
  },
  defaultIce: {
    impact: 4,
    confidence: 7,
    effort: 9,
    rationale: {
      en: 'Display recommendation so value proposition and CTA are visible without truncation.',
      fr: 'Recommandation d affichage pour présenter la proposition de valeur et le CTA sans coupure.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '90-days',
  kpi: {
    en: 'Improved SERP CTR on commercial pages',
    fr: 'Amélioration du CTR SERP sur les pages commerciales',
  },
};

export const RULE_ONPAGE_07: RuleDefinition = {
  id: 'R-ONPAGE-07',
  category: 'on-page',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
  title: {
    en: 'Single unique H1 heading on every public page',
    fr: 'Présence d un titre H1 unique par page publique',
  },
  defaultIce: {
    impact: 8,
    confidence: 9,
    effort: 9,
    rationale: {
      en: 'Clarifies primary topic hierarchy for users, screen readers, and search engines.',
      fr: 'Clarifie le sujet principal et la hiérarchie documentaire pour les lecteurs et les moteurs.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% of public pages contain exactly 1 H1',
    fr: '100 % des pages publiques comportent exactement 1 H1',
  },
};

export const RULE_ONPAGE_08: RuleDefinition = {
  id: 'R-ONPAGE-08',
  category: 'on-page',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/google-images',
  title: {
    en: 'Descriptive alt attribute on public page images',
    fr: 'Attribut alt renseigné sur les images des pages publiques',
  },
  defaultIce: {
    impact: 6,
    confidence: 9,
    effort: 9,
    rationale: {
      en: 'Essential for accessibility (WCAG AA) and Google Images indexing.',
      fr: 'Indispensable pour l accessibilité (WCAG AA) et le référencement Google Images.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% of images on public pages have a non-empty alt attribute',
    fr: '100 % des images des pages publiques ont un attribut alt renseigné',
  },
};

export const ONPAGE_RULES: ReadonlyArray<RuleDefinition> = [
  RULE_ONPAGE_01,
  RULE_ONPAGE_02,
  RULE_ONPAGE_03,
  RULE_ONPAGE_04,
  RULE_ONPAGE_05,
  RULE_ONPAGE_06,
  RULE_ONPAGE_07,
  RULE_ONPAGE_08,
];

export function evaluateOnPageRules(
  routes: ReadonlyArray<ExtractedRouteData>,
): ReadonlyArray<Finding> {
  const findings: Finding[] = [];
  const publicRoutes = routes.filter((r) => !r.route.isPrivate);

  const routesByTitle = new Map<string, ExtractedRouteData[]>();
  const routesByDesc = new Map<string, ExtractedRouteData[]>();

  for (const item of publicRoutes) {
    const { route } = item;

    if (!item.title || item.title.value.trim().length === 0) {
      findings.push(
        createFindingFromRule(RULE_ONPAGE_01, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: 1,
            observed: 'Missing title metadata or <title> tag',
            expected: 'Non-empty unique title (recommended 50–60 chars)',
          },
          remediation: {
            en: `Define a unique title in ${route.filePath} for route ${route.pattern}.`,
            fr: `Définir un title unique dans ${route.filePath} pour la route ${route.pattern}.`,
          },
        }),
      );
    } else {
      const normalizedTitle = item.title.value.trim();
      const list = routesByTitle.get(normalizedTitle) ?? [];
      list.push(item);
      routesByTitle.set(normalizedTitle, list);

      if (normalizedTitle.length < 50 || normalizedTitle.length > 60) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_03, {
            subjectRef: route.pattern,
            evidence: {
              source: 'code-scan',
              filePath: route.filePath,
              lineNumber: item.title.line,
              observed: `Title length is ${normalizedTitle.length} chars ("${normalizedTitle}")`,
              expected: 'Recommended 50 to 60 characters for optimal SERP display',
            },
            remediation: {
              en: `Adjust title length on ${route.pattern} (${normalizedTitle.length} chars) toward the 50–60 char display window.`,
              fr: `Ajuster la longueur du title sur ${route.pattern} (${normalizedTitle.length} caractères) vers la plage recommandée de 50 à 60 caractères.`,
            },
          }),
        );
      }
    }

    if (!item.description || item.description.value.trim().length === 0) {
      findings.push(
        createFindingFromRule(RULE_ONPAGE_04, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: 1,
            observed: 'Missing meta description',
            expected: 'Unique meta description (recommended 150–160 chars)',
          },
          remediation: {
            en: `Add a unique meta description in ${route.filePath} for route ${route.pattern}.`,
            fr: `Ajouter une meta description unique dans ${route.filePath} pour la route ${route.pattern}.`,
          },
        }),
      );
    } else {
      const normalizedDesc = item.description.value.trim();
      const list = routesByDesc.get(normalizedDesc) ?? [];
      list.push(item);
      routesByDesc.set(normalizedDesc, list);

      if (normalizedDesc.length < 150 || normalizedDesc.length > 160) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_06, {
            subjectRef: route.pattern,
            evidence: {
              source: 'code-scan',
              filePath: route.filePath,
              lineNumber: item.description.line,
              observed: `Description length is ${normalizedDesc.length} chars`,
              expected: 'Recommended 150 to 160 characters for optimal SERP snippet',
            },
            remediation: {
              en: `Adjust meta description length on ${route.pattern} (${normalizedDesc.length} chars) toward 150–160 chars.`,
              fr: `Ajuster la longueur de la meta description sur ${route.pattern} (${normalizedDesc.length} caractères) vers 150 à 160 caractères.`,
            },
          }),
        );
      }
    }

    const h1Headings = item.headings.filter((h) => h.level === 1);
    if (h1Headings.length !== 1) {
      const lineNum = h1Headings[1]?.line ?? h1Headings[0]?.line ?? 1;
      findings.push(
        createFindingFromRule(RULE_ONPAGE_07, {
          subjectRef: route.pattern,
          evidence: {
            source: 'code-scan',
            filePath: route.filePath,
            lineNumber: lineNum,
            observed: `Found ${h1Headings.length} H1 heading(s) on ${route.pattern}`,
            expected: 'Exactly 1 H1 heading per public page',
          },
          remediation: {
            en:
              h1Headings.length === 0
                ? `Add a primary <h1> heading in ${route.filePath}.`
                : `Keep only one <h1> in ${route.filePath} (line ${lineNum}) and demote secondary headings to <h2>.`,
            fr:
              h1Headings.length === 0
                ? `Ajouter un titre principal <h1> dans ${route.filePath}.`
                : `Conserver un seul <h1> dans ${route.filePath} (ligne ${lineNum}) et passer les autres en <h2>.`,
          },
        }),
      );
    }

    for (const img of item.images) {
      if (!img.hasAlt) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_08, {
            subjectRef: `${route.pattern}#img:${img.src || img.line}`,
            evidence: {
              source: 'code-scan',
              filePath: route.filePath,
              lineNumber: img.line,
              observed: `Image "${img.src}" is missing a non-empty alt attribute`,
              expected: 'Descriptive alt="..." attribute on image element',
            },
            remediation: {
              en: `Add a descriptive alt attribute to image "${img.src}" at ${route.filePath}:${img.line}.`,
              fr: `Ajouter un attribut alt descriptif sur l image "${img.src}" dans ${route.filePath}:${img.line}.`,
            },
          }),
        );
      }
    }
  }

  for (const [dupTitle, dupRoutes] of routesByTitle.entries()) {
    if (dupRoutes.length > 1) {
      const patterns = dupRoutes.map((d) => d.route.pattern).join(', ');
      for (const item of dupRoutes) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_02, {
            subjectRef: item.route.pattern,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: item.title?.line ?? 1,
              observed: `Duplicate title "${dupTitle}" shared across: ${patterns}`,
              expected: 'Unique title per public page targeting a distinct query',
            },
            remediation: {
              en: `Differentiate the title of ${item.route.pattern} (${item.route.filePath}:${item.title?.line ?? 1}) from ${patterns}.`,
              fr: `Différencier le title de ${item.route.pattern} (${item.route.filePath}:${item.title?.line ?? 1}) partagé avec ${patterns}.`,
            },
          }),
        );
      }
    }
  }

  for (const [dupDesc, dupRoutes] of routesByDesc.entries()) {
    if (dupRoutes.length > 1) {
      const patterns = dupRoutes.map((d) => d.route.pattern).join(', ');
      for (const item of dupRoutes) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_05, {
            subjectRef: item.route.pattern,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: item.description?.line ?? 1,
              observed: `Duplicate meta description "${dupDesc}" shared across: ${patterns}`,
              expected: 'Unique meta description per public page',
            },
            remediation: {
              en: `Write a unique meta description for ${item.route.pattern} (${item.route.filePath}:${item.description?.line ?? 1}).`,
              fr: `Rédiger une meta description unique pour ${item.route.pattern} (${item.route.filePath}:${item.description?.line ?? 1}).`,
            },
          }),
        );
      }
    }
  }

  return findings;
}

