import type {
  CrawlPage,
  ExtractedRouteData,
  Finding,
  RuleDefinition,
} from '@seo-partner/core';
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

export const RULE_ONPAGE_09: RuleDefinition = {
  id: 'R-ONPAGE-09',
  category: 'on-page',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
  title: {
    en: 'Logical heading hierarchy without skipped levels (e.g. H1 -> H3)',
    fr: 'Hiérarchie logique des titres Hn sans saut de niveau (ex. H1 -> H3)',
  },
  defaultIce: {
    impact: 5,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Sequential heading levels improve semantic structure and screen-reader navigation.',
      fr: 'Des niveaux de titres séquentiels améliorent la structure sémantique et la navigation assistée.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '0 skipped heading levels across public pages',
    fr: '0 saut de niveau dans la hiérarchie Hn des pages publiques',
  },
};

export const RULE_ONPAGE_10: RuleDefinition = {
  id: 'R-ONPAGE-10',
  category: 'on-page',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
  title: {
    en: 'Unique H1 heading content across public pages',
    fr: 'Unicité du contenu H1 entre les différentes pages publiques',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Duplicate H1 headings across distinct URLs blur topical differentiation.',
      fr: 'Des titres H1 identiques sur plusieurs URLs brouillent la différenciation sémantique.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: '0 duplicate H1 headings across public routes',
    fr: '0 doublon de titre H1 sur les routes publiques',
  },
};

export const RULE_ONPAGE_11: RuleDefinition = {
  id: 'R-ONPAGE-11',
  category: 'on-page',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/core-web-vitals',
  title: {
    en: 'Explicit width and height attributes on images (CLS prevention)',
    fr: 'Dimensions explicites width et height sur les images (prévention du CLS)',
  },
  defaultIce: {
    impact: 6,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Reserving image aspect ratio prevents Cumulative Layout Shift (Core Web Vitals).',
      fr: 'La réservation des dimensions d image prévient les décalages de mise en page (CLS).',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% of images specify width and height attributes',
    fr: '100 % des images déclarent les attributs width et height',
  },
};

export const RULE_ONPAGE_12: RuleDefinition = {
  id: 'R-ONPAGE-12',
  category: 'on-page',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
  title: {
    en: 'Descriptive internal link anchor text (no empty or generic anchors)',
    fr: 'Texte d ancre descriptif sur les liens internes (absence d ancres vides ou génériques)',
  },
  defaultIce: {
    impact: 6,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Descriptive anchor text transfers topical context to the linked destination page.',
      fr: 'Un texte d ancre descriptif transmet le contexte thématique à la page de destination.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: '0 generic ("click here", "cliquez ici") or empty internal link anchors',
    fr: '0 ancre interne vide ou générique ("cliquez ici", "lire la suite")',
  },
};

export const RULE_ONPAGE_13: RuleDefinition = {
  id: 'R-ONPAGE-13',
  category: 'on-page',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/visual-elements-gallery',
  title: {
    en: 'Complete Open Graph metadata (og:title, og:description, og:image)',
    fr: 'Complétude des balises Open Graph essentielles (og:title, og:description, og:image)',
  },
  defaultIce: {
    impact: 5,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Ensures rich social and messaging link previews with title, summary, and thumbnail.',
      fr: 'Garantit des aperçus de partage complets avec titre, description et vignette.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '90-days',
  kpi: {
    en: 'All pages with Open Graph declare og:title, og:description, and og:image',
    fr: 'Toutes les pages utilisant Open Graph déclarent og:title, og:description et og:image',
  },
};

export const RULE_ONPAGE_14: RuleDefinition = {
  id: 'R-ONPAGE-14',
  category: 'on-page',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  title: {
    en: 'Consistency of <title> and <h1> between source code and crawled HTML',
    fr: 'Concordance du <title> et du <h1> entre le code source et le HTML crawlé',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 7,
    rationale: {
      en: 'Unexpected runtime overrides of title or H1 indicate middleware or client hydration mismatches.',
      fr: 'Un écart entre le code et le HTML servi révèle une réécriture imprévue ou un problème d hydratation.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% consistency between source title/H1 and crawled HTML',
    fr: '100 % de cohérence entre les titres du code source et ceux du rendu crawlé',
  },
};

export const ONPAGE_RULES_V01: ReadonlyArray<RuleDefinition> = [
  RULE_ONPAGE_01,
  RULE_ONPAGE_02,
  RULE_ONPAGE_03,
  RULE_ONPAGE_04,
  RULE_ONPAGE_05,
  RULE_ONPAGE_06,
  RULE_ONPAGE_07,
  RULE_ONPAGE_08,
];

export const ONPAGE_RULES: ReadonlyArray<RuleDefinition> = [
  ...ONPAGE_RULES_V01,
  RULE_ONPAGE_09,
  RULE_ONPAGE_10,
  RULE_ONPAGE_11,
  RULE_ONPAGE_12,
  RULE_ONPAGE_13,
  RULE_ONPAGE_14,
];

const GENERIC_ANCHORS = new Set([
  'click here',
  'here',
  'read more',
  'more',
  'learn more',
  'link',
  'cliquez ici',
  'ici',
  'lire la suite',
  'en savoir plus',
  'voir plus',
  'lien',
]);

export function evaluateOnPageRules(
  routes: ReadonlyArray<ExtractedRouteData>,
  crawlPages?: ReadonlyArray<CrawlPage>,
): ReadonlyArray<Finding> {
  const findings: Finding[] = [];
  const publicRoutes = routes.filter((r) => !r.route.isPrivate);

  const routesByTitle = new Map<string, ExtractedRouteData[]>();
  const routesByDesc = new Map<string, ExtractedRouteData[]>();
  const routesByH1 = new Map<string, ExtractedRouteData[]>();

  const crawlByPattern = new Map<string, CrawlPage>();
  if (crawlPages) {
    for (const cp of crawlPages) {
      crawlByPattern.set(cp.routePattern, cp);
    }
  }

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
    } else {
      const firstH1Text = h1Headings[0]?.text.trim() ?? '';
      if (firstH1Text.length > 0) {
        const list = routesByH1.get(firstH1Text) ?? [];
        list.push(item);
        routesByH1.set(firstH1Text, list);
      }
    }

    // R-ONPAGE-09: Skipped heading level (e.g. H1 -> H3)
    for (let i = 1; i < item.headings.length; i += 1) {
      const prev = item.headings[i - 1]!;
      const curr = item.headings[i]!;
      if (curr.level > prev.level + 1) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_09, {
            subjectRef: `${route.pattern}#h${curr.level}:${curr.line}`,
            evidence: {
              source: 'code-scan',
              filePath: route.filePath,
              lineNumber: curr.line,
              observed: `Heading jump from H${prev.level} to H${curr.level} ("${curr.text}")`,
              expected: `Sequential heading hierarchy (expected H${prev.level + 1} after H${prev.level})`,
            },
            remediation: {
              en: `Change <h${curr.level}> at ${route.filePath}:${curr.line} to <h${prev.level + 1}> to preserve heading hierarchy.`,
              fr: `Remplacer <h${curr.level}> dans ${route.filePath}:${curr.line} par <h${prev.level + 1}> pour respecter la hiérarchie des titres.`,
            },
          }),
        );
      }
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

      // R-ONPAGE-11: Missing width or height on image
      const hasWidth = img.width !== null && img.width !== undefined && String(img.width).trim() !== '';
      const hasHeight = img.height !== null && img.height !== undefined && String(img.height).trim() !== '';
      if (!hasWidth || !hasHeight) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_11, {
            subjectRef: `${route.pattern}#img-dim:${img.src || img.line}`,
            evidence: {
              source: 'code-scan',
              filePath: route.filePath,
              lineNumber: img.line,
              observed: `Image "${img.src}" is missing explicit width/height attributes`,
              expected: 'Explicit width and height attributes to prevent layout shift (CLS)',
            },
            remediation: {
              en: `Add explicit width and height attributes to image "${img.src}" at ${route.filePath}:${img.line}.`,
              fr: `Ajouter les attributs width et height sur l image "${img.src}" dans ${route.filePath}:${img.line}.`,
            },
          }),
        );
      }
    }

    // R-ONPAGE-12: Empty or generic internal link anchor text
    for (const link of item.links) {
      if (link.kind !== 'internal') continue;
      const anchorNorm = link.anchorText.trim().toLowerCase();
      if (anchorNorm.length === 0 || GENERIC_ANCHORS.has(anchorNorm)) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_12, {
            subjectRef: `${route.pattern}#link:${link.line}`,
            evidence: {
              source: 'code-scan',
              filePath: route.filePath,
              lineNumber: link.line,
              observed: `Internal link to "${link.toUrl}" uses generic or empty anchor "${link.anchorText}"`,
              expected: 'Descriptive keyword-rich anchor text explaining the target page',
            },
            remediation: {
              en: `Replace anchor text "${link.anchorText || '(empty)'}" at ${route.filePath}:${link.line} with descriptive text for ${link.toUrl}.`,
              fr: `Remplacer l ancre "${link.anchorText || '(vide)'}" dans ${route.filePath}:${link.line} par un libellé descriptif de la page ${link.toUrl}.`,
            },
          }),
        );
      }
    }

    // R-ONPAGE-13: Incomplete Open Graph metadata when OG tags are partially configured
    const ogKeys = Object.keys(item.openGraph);
    if (ogKeys.length > 0) {
      const hasOgTitle = Boolean(item.openGraph['title'] ?? item.openGraph['og:title']);
      const hasOgDesc = Boolean(item.openGraph['description'] ?? item.openGraph['og:description']);
      const hasOgImage = Boolean(item.openGraph['image'] ?? item.openGraph['og:image'] ?? item.openGraph['images']);
      if (!hasOgTitle || !hasOgDesc || !hasOgImage) {
        const missing: string[] = [];
        if (!hasOgTitle) missing.push('og:title');
        if (!hasOgDesc) missing.push('og:description');
        if (!hasOgImage) missing.push('og:image');
        findings.push(
          createFindingFromRule(RULE_ONPAGE_13, {
            subjectRef: route.pattern,
            evidence: {
              source: 'code-scan',
              filePath: route.filePath,
              lineNumber: 1,
              observed: `Incomplete Open Graph metadata (missing: ${missing.join(', ')})`,
              expected: 'Complete Open Graph set: og:title, og:description, og:image',
            },
            remediation: {
              en: `Add missing Open Graph properties (${missing.join(', ')}) in ${route.filePath}.`,
              fr: `Compléter les propriétés Open Graph manquantes (${missing.join(', ')}) dans ${route.filePath}.`,
            },
          }),
        );
      }
    }

    // R-ONPAGE-14: Divergence between source code <title>/<h1> and crawled HTML
    const crawled = crawlByPattern.get(route.pattern);
    if (crawled && crawled.statusCode >= 200 && crawled.statusCode < 300) {
      const codeTitle = item.title?.value.trim() ?? null;
      const crawledTitle = crawled.title?.trim() ?? null;
      const codeH1 = h1Headings[0]?.text.trim() ?? null;
      const crawledH1 = crawled.h1?.trim() ?? null;

      const titleMismatch = Boolean(codeTitle && crawledTitle && codeTitle !== crawledTitle);
      const h1Mismatch = Boolean(codeH1 && crawledH1 && codeH1 !== crawledH1);

      if (titleMismatch || h1Mismatch) {
        findings.push(
          createFindingFromRule(RULE_ONPAGE_14, {
            subjectRef: route.pattern,
            evidence: {
              source: 'code-vs-crawl',
              filePath: route.filePath,
              lineNumber: item.title?.line ?? h1Headings[0]?.line ?? 1,
              url: crawled.url,
              statusCode: crawled.statusCode,
              observed: titleMismatch
                ? `Code title "${codeTitle}" != crawled title "${crawledTitle}"`
                : `Code H1 "${codeH1}" != crawled H1 "${crawledH1}"`,
              expected: 'Identical <title> and <h1> between source code and rendered HTML',
            },
            remediation: {
              en: `Verify why ${crawled.url} renders different title/H1 than ${route.filePath}.`,
              fr: `Vérifier pourquoi le rendu HTTP de ${crawled.url} diffère du title/H1 défini dans ${route.filePath}.`,
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

  // R-ONPAGE-10: Duplicate H1 across public routes
  for (const [dupH1, dupRoutes] of routesByH1.entries()) {
    if (dupRoutes.length > 1) {
      const patterns = dupRoutes.map((d) => d.route.pattern).join(', ');
      for (const item of dupRoutes) {
        const h1Line = item.headings.find((h) => h.level === 1)?.line ?? 1;
        findings.push(
          createFindingFromRule(RULE_ONPAGE_10, {
            subjectRef: item.route.pattern,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: h1Line,
              observed: `Duplicate H1 "${dupH1}" shared across: ${patterns}`,
              expected: 'Unique H1 heading per public page',
            },
            remediation: {
              en: `Differentiate the H1 heading of ${item.route.pattern} (${item.route.filePath}:${h1Line}) from ${patterns}.`,
              fr: `Différencier le titre H1 de ${item.route.pattern} (${item.route.filePath}:${h1Line}) partagé avec ${patterns}.`,
            },
          }),
        );
      }
    }
  }

  return findings;
}
