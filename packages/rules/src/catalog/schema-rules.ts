import type { ExtractedRouteData, Finding, RuleDefinition } from '@seo-partner/core';
import { createFindingFromRule } from '../ice-scorer.js';

export const RULE_SCHEMA_01: RuleDefinition = {
  id: 'R-SCHEMA-01',
  category: 'schema',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/sd-policies',
  title: {
    en: 'Valid and compliant JSON-LD structured data',
    fr: 'Validité syntaxique et conformité des données structurées JSON-LD',
  },
  defaultIce: {
    impact: 8,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Invalid JSON-LD prevents Rich Results eligibility and entity disambiguation.',
      fr: 'Un JSON-LD invalide bloque l éligibilité aux résultats enrichis et la compréhension d entité.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% valid JSON-LD items in Rich Results Test',
    fr: '100 % des blocs JSON-LD valides au Test des résultats enrichis',
  },
};

export const RULE_SCHEMA_02: RuleDefinition = {
  id: 'R-SCHEMA-02',
  category: 'schema',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/organization',
  title: {
    en: 'Organization or WebSite schema includes required name and url',
    fr: 'Schéma Organization ou WebSite complet (propriétés name et url présentes)',
  },
  defaultIce: {
    impact: 6,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Organization and WebSite entities require name and url for Knowledge Graph recognition.',
      fr: 'Les entités Organization et WebSite exigent name et url pour l identification Knowledge Graph.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'Organization/WebSite JSON-LD contains non-empty name and url',
    fr: 'Les schémas Organization/WebSite contiennent name et url renseignés',
  },
};

export const RULE_SCHEMA_03: RuleDefinition = {
  id: 'R-SCHEMA-03',
  category: 'schema',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/article',
  title: {
    en: 'Article or BlogPosting schema includes headline, datePublished, and author',
    fr: 'Schéma Article ou BlogPosting complet (headline, datePublished et author)',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Required properties for Google Article rich result features and authorship signals.',
      fr: 'Propriétés requises par Google pour l affichage enrichi des articles et la paternité éditoriale.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% of Article/BlogPosting schemas declare headline, datePublished, and author',
    fr: '100 % des schémas Article/BlogPosting déclarent headline, datePublished et author',
  },
};

export const RULE_SCHEMA_04: RuleDefinition = {
  id: 'R-SCHEMA-04',
  category: 'schema',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/product',
  title: {
    en: 'Product schema includes name and offers or review/aggregateRating',
    fr: 'Schéma Product complet (name et offers ou review/aggregateRating)',
  },
  defaultIce: {
    impact: 8,
    confidence: 10,
    effort: 7,
    rationale: {
      en: 'Google Product snippets require name plus offers, review, or aggregateRating.',
      fr: 'Les extraits enrichis Produit Google exigent name ainsi que offers, review ou aggregateRating.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '0 Product schema errors in Google Search Console',
    fr: '0 erreur de schéma Product dans Google Search Console',
  },
};

export const RULE_SCHEMA_05: RuleDefinition = {
  id: 'R-SCHEMA-05',
  category: 'schema',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb',
  title: {
    en: 'FAQPage or BreadcrumbList schema includes non-empty mainEntity or itemListElement',
    fr: 'Schéma FAQPage ou BreadcrumbList complet (mainEntity ou itemListElement non vide)',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Empty itemListElement or mainEntity invalidates Breadcrumb and FAQ structured data.',
      fr: 'Un tableau itemListElement ou mainEntity vide invalide les données structurées Fil d Ariane ou FAQ.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'All FAQPage/BreadcrumbList schemas contain valid list items',
    fr: 'Tous les schémas FAQPage/BreadcrumbList contiennent des entrées valides',
  },
};

export const SCHEMA_RULES_V01: ReadonlyArray<RuleDefinition> = [RULE_SCHEMA_01];

export const SCHEMA_RULES: ReadonlyArray<RuleDefinition> = [
  RULE_SCHEMA_01,
  RULE_SCHEMA_02,
  RULE_SCHEMA_03,
  RULE_SCHEMA_04,
  RULE_SCHEMA_05,
];

function isNonEmptyValue(val: unknown): boolean {
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (val && typeof val === 'object') return Object.keys(val).length > 0;
  return false;
}

export function evaluateSchemaRules(
  routes: ReadonlyArray<ExtractedRouteData>,
): ReadonlyArray<Finding> {
  const findings: Finding[] = [];

  for (const item of routes) {
    if (item.route.isPrivate) continue;
    for (const schema of item.jsonLdItems) {
      if (!schema.isValid) {
        findings.push(
          createFindingFromRule(RULE_SCHEMA_01, {
            subjectRef: `${item.route.pattern}#jsonld:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: schema.validationError ?? 'Invalid JSON-LD block',
              expected: 'Valid JSON-LD containing "@context": "https://schema.org" and "@type"',
            },
            remediation: {
              en: `Fix the JSON-LD structured data in ${item.route.filePath}:${schema.line} (${schema.validationError ?? 'invalid schema'}).`,
              fr: `Corriger le bloc JSON-LD dans ${item.route.filePath}:${schema.line} (${schema.validationError ?? 'schéma invalide'}).`,
            },
          }),
        );
        continue;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(schema.rawJson) as Record<string, unknown>;
      } catch {
        continue;
      }

      const sType = schema.schemaType ?? '';
      const extraKeys = Object.keys(parsed).filter((k) => k !== '@context' && k !== '@type');

      // R-SCHEMA-02: Organization / WebSite
      if (
        (sType === 'Organization' || sType === 'WebSite') &&
        extraKeys.length > 0 &&
        (!isNonEmptyValue(parsed['name']) || !isNonEmptyValue(parsed['url']))
      ) {
        findings.push(
          createFindingFromRule(RULE_SCHEMA_02, {
            subjectRef: `${item.route.pattern}#schema:${sType}:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: `${sType} schema is missing required "name" or "url" property`,
              expected: `${sType} schema with both "name" and "url" properties`,
            },
            remediation: {
              en: `Add both "name" and "url" properties to the ${sType} JSON-LD at ${item.route.filePath}:${schema.line}.`,
              fr: `Renseigner les propriétés "name" et "url" dans le schéma ${sType} (${item.route.filePath}:${schema.line}).`,
            },
          }),
        );
      }

      // R-SCHEMA-03: Article / BlogPosting / NewsArticle
      if (sType === 'Article' || sType === 'BlogPosting' || sType === 'NewsArticle') {
        const missing: string[] = [];
        if (!isNonEmptyValue(parsed['headline'])) missing.push('headline');
        if (!isNonEmptyValue(parsed['datePublished'])) missing.push('datePublished');
        if (!isNonEmptyValue(parsed['author'])) missing.push('author');
        if (missing.length > 0) {
          findings.push(
            createFindingFromRule(RULE_SCHEMA_03, {
              subjectRef: `${item.route.pattern}#schema:${sType}:${schema.line}`,
              evidence: {
                source: 'code-scan',
                filePath: item.route.filePath,
                lineNumber: schema.line,
                observed: `${sType} schema is missing: ${missing.join(', ')}`,
                expected: `${sType} schema with headline, datePublished, and author`,
              },
              remediation: {
                en: `Add ${missing.join(', ')} to the ${sType} JSON-LD at ${item.route.filePath}:${schema.line}.`,
                fr: `Ajouter ${missing.join(', ')} au schéma ${sType} dans ${item.route.filePath}:${schema.line}.`,
              },
            }),
          );
        }
      }

      // R-SCHEMA-04: Product
      if (sType === 'Product') {
        const hasName = isNonEmptyValue(parsed['name']);
        const hasOfferOrReview =
          isNonEmptyValue(parsed['offers']) ||
          isNonEmptyValue(parsed['review']) ||
          isNonEmptyValue(parsed['aggregateRating']);
        if (!hasName || !hasOfferOrReview) {
          findings.push(
            createFindingFromRule(RULE_SCHEMA_04, {
              subjectRef: `${item.route.pattern}#schema:Product:${schema.line}`,
              evidence: {
                source: 'code-scan',
                filePath: item.route.filePath,
                lineNumber: schema.line,
                observed: 'Product schema is missing "name" or ("offers" / "review" / "aggregateRating")',
                expected: 'Product schema with "name" and "offers" (or "review"/"aggregateRating")',
              },
              remediation: {
                en: `Complete the Product JSON-LD at ${item.route.filePath}:${schema.line} with "name" and "offers".`,
                fr: `Compléter le schéma Product dans ${item.route.filePath}:${schema.line} avec "name" et "offers".`,
              },
            }),
          );
        }
      }

      // R-SCHEMA-05: FAQPage / BreadcrumbList
      if (sType === 'FAQPage' && !isNonEmptyValue(parsed['mainEntity'])) {
        findings.push(
          createFindingFromRule(RULE_SCHEMA_05, {
            subjectRef: `${item.route.pattern}#schema:FAQPage:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: 'FAQPage schema has missing or empty "mainEntity" array',
              expected: 'Non-empty "mainEntity" array of Question/AcceptedAnswer items',
            },
            remediation: {
              en: `Populate "mainEntity" in FAQPage JSON-LD at ${item.route.filePath}:${schema.line}.`,
              fr: `Renseigner le tableau "mainEntity" du schéma FAQPage dans ${item.route.filePath}:${schema.line}.`,
            },
          }),
        );
      } else if (sType === 'BreadcrumbList' && !isNonEmptyValue(parsed['itemListElement'])) {
        findings.push(
          createFindingFromRule(RULE_SCHEMA_05, {
            subjectRef: `${item.route.pattern}#schema:BreadcrumbList:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: 'BreadcrumbList schema has missing or empty "itemListElement" array',
              expected: 'Non-empty "itemListElement" array of ListItem elements',
            },
            remediation: {
              en: `Populate "itemListElement" in BreadcrumbList JSON-LD at ${item.route.filePath}:${schema.line}.`,
              fr: `Renseigner le tableau "itemListElement" du schéma BreadcrumbList dans ${item.route.filePath}:${schema.line}.`,
            },
          }),
        );
      }
    }
  }

  return findings;
}
