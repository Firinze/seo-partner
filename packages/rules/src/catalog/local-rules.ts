import type { ExtractedRouteData, Finding, RuleDefinition } from '@seo-partner/core';
import { createFindingFromRule } from '../ice-scorer.js';

export const RULE_LOCAL_01: RuleDefinition = {
  id: 'R-LOCAL-01',
  category: 'local',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/local-business',
  title: {
    en: 'LocalBusiness schema includes structured postal address',
    fr: 'Schéma LocalBusiness doté d une adresse postale structurée (address)',
  },
  defaultIce: {
    impact: 8,
    confidence: 10,
    effort: 8,
    rationale: {
      en: ' Google requires a PostalAddress property on LocalBusiness entities for local pack eligibility.',
      fr: 'Google exige la propriété address (PostalAddress) sur toute entité LocalBusiness.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: 'immediate',
  kpi: {
    en: '100% of LocalBusiness schemas declare a complete address object',
    fr: '100 % des schémas LocalBusiness déclarent un objet address complet',
  },
};

export const RULE_LOCAL_02: RuleDefinition = {
  id: 'R-LOCAL-02',
  category: 'local',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/local-business',
  title: {
    en: 'LocalBusiness schema includes a telephone number (NAP)',
    fr: 'Schéma LocalBusiness doté d un numéro de téléphone (cohérence NAP)',
  },
  defaultIce: {
    impact: 7,
    confidence: 10,
    effort: 9,
    rationale: {
      en: 'Name, Address, and Phone (NAP) consistency is foundational for local SEO trust.',
      fr: 'La cohérence Nom, Adresse, Téléphone (NAP) est fondamentale pour le référencement local.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '30-days',
  kpi: {
    en: 'LocalBusiness schema declares a valid telephone property',
    fr: 'Le schéma LocalBusiness déclare une propriété telephone valide',
  },
};

export const RULE_LOCAL_03: RuleDefinition = {
  id: 'R-LOCAL-03',
  category: 'local',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/local-business',
  title: {
    en: 'LocalBusiness telephone formatted in international E.164 format (+...)',
    fr: 'Numéro de téléphone LocalBusiness au format international E.164 (+...)',
  },
  defaultIce: {
    impact: 6,
    confidence: 9,
    effort: 9,
    rationale: {
      en: 'International country prefix (+33, +1, etc.) prevents ambiguity for global parsers.',
      fr: 'L indicatif international (+33, +229, etc.) évite toute ambiguïté pour les moteurs.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'All LocalBusiness telephone numbers start with "+" country code',
    fr: 'Tous les numéros de téléphone LocalBusiness débutent par l indicatif "+"',
  },
};

export const RULE_LOCAL_04: RuleDefinition = {
  id: 'R-LOCAL-04',
  category: 'local',
  defaultSeverity: 'low',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/local-business',
  title: {
    en: 'LocalBusiness schema includes openingHoursSpecification or geo coordinates',
    fr: 'Schéma LocalBusiness enrichi des horaires (openingHoursSpecification) ou coordonnées (geo)',
  },
  defaultIce: {
    impact: 6,
    confidence: 8,
    effort: 8,
    rationale: {
      en: 'Geo coordinates and opening hours strengthen local relevance and Knowledge Panel details.',
      fr: 'Les coordonnées GPS et horaires d ouverture renforcent la pertinence locale et le Knowledge Panel.',
    },
  },
  ownerRole: 'content',
  targetTimeframe: '90-days',
  kpi: {
    en: 'LocalBusiness schema includes geo or openingHoursSpecification',
    fr: 'Le schéma LocalBusiness inclut geo ou openingHoursSpecification',
  },
};

export const LOCAL_RULES: ReadonlyArray<RuleDefinition> = [
  RULE_LOCAL_01,
  RULE_LOCAL_02,
  RULE_LOCAL_03,
  RULE_LOCAL_04,
];

const LOCAL_BUSINESS_TYPES = new Set([
  'LocalBusiness',
  'Restaurant',
  'Store',
  'MedicalBusiness',
  'LegalService',
  'RealEstateAgent',
  'FinancialService',
  'AutomotiveBusiness',
  'Hotel',
  'ProfessionalService',
]);

export function evaluateLocalRules(
  routes: ReadonlyArray<ExtractedRouteData>,
): ReadonlyArray<Finding> {
  const findings: Finding[] = [];

  for (const item of routes) {
    if (item.route.isPrivate) continue;
    for (const schema of item.jsonLdItems) {
      if (!schema.isValid || !schema.schemaType) continue;
      if (!LOCAL_BUSINESS_TYPES.has(schema.schemaType)) continue;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(schema.rawJson) as Record<string, unknown>;
      } catch {
        continue;
      }

      const addressVal = parsed['address'];
      const hasAddress =
        (typeof addressVal === 'string' && addressVal.trim().length > 0) ||
        (Boolean(addressVal) &&
          typeof addressVal === 'object' &&
          Object.keys(addressVal as object).length > 0);

      if (!hasAddress) {
        findings.push(
          createFindingFromRule(RULE_LOCAL_01, {
            subjectRef: `${item.route.pattern}#local:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: `${schema.schemaType} schema is missing "address" property`,
              expected: 'PostalAddress object with streetAddress, addressLocality, postalCode, addressCountry',
            },
            remediation: {
              en: `Add a structured "address" (PostalAddress) to the ${schema.schemaType} schema at ${item.route.filePath}:${schema.line}.`,
              fr: `Ajouter une propriété "address" (PostalAddress) au schéma ${schema.schemaType} dans ${item.route.filePath}:${schema.line}.`,
            },
          }),
        );
      }

      const telVal = typeof parsed['telephone'] === 'string' ? parsed['telephone'].trim() : '';
      if (!telVal) {
        findings.push(
          createFindingFromRule(RULE_LOCAL_02, {
            subjectRef: `${item.route.pattern}#local-tel:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: `${schema.schemaType} schema is missing "telephone" property`,
              expected: 'Non-empty "telephone" property in E.164 international format',
            },
            remediation: {
              en: `Add a "telephone" property to the ${schema.schemaType} schema at ${item.route.filePath}:${schema.line}.`,
              fr: `Ajouter la propriété "telephone" au schéma ${schema.schemaType} dans ${item.route.filePath}:${schema.line}.`,
            },
          }),
        );
      } else if (!/^\+[1-9][0-9\s.-]{6,18}$/.test(telVal)) {
        findings.push(
          createFindingFromRule(RULE_LOCAL_03, {
            subjectRef: `${item.route.pattern}#local-e164:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: `Telephone "${telVal}" is not in international format (+countryCode...)`,
              expected: 'International format starting with "+" (e.g. "+33 1 40 50 60 70")',
            },
            remediation: {
              en: `Format telephone "${telVal}" at ${item.route.filePath}:${schema.line} with its international prefix (+...).`,
              fr: `Formater le numéro "${telVal}" dans ${item.route.filePath}:${schema.line} avec son indicatif international (+...).`,
            },
          }),
        );
      }

      const hasHoursOrGeo =
        Boolean(parsed['openingHoursSpecification']) ||
        Boolean(parsed['openingHours']) ||
        Boolean(parsed['geo']);
      if (!hasHoursOrGeo) {
        findings.push(
          createFindingFromRule(RULE_LOCAL_04, {
            subjectRef: `${item.route.pattern}#local-geo:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: `${schema.schemaType} schema has neither "openingHoursSpecification" nor "geo"`,
              expected: 'At least "openingHoursSpecification" or "geo" (GeoCoordinates)',
            },
            remediation: {
              en: `Add "openingHoursSpecification" and/or "geo" coordinates to ${schema.schemaType} at ${item.route.filePath}:${schema.line}.`,
              fr: `Ajouter "openingHoursSpecification" et/ou les coordonnées "geo" au schéma ${schema.schemaType} dans ${item.route.filePath}:${schema.line}.`,
            },
          }),
        );
      }
    }
  }

  return findings;
}

