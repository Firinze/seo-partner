import type {
  CwvMetricRecord,
  Finding,
  RuleDefinition,
} from '@seo-partner/core';
import { createFindingFromRule } from '../ice-scorer.js';

export const RULE_PERF_01: RuleDefinition = {
  id: 'R-PERF-01',
  category: 'performance',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://web.dev/articles/lcp',
  title: {
    en: 'Largest Contentful Paint (LCP) exceeds recommended threshold',
    fr: 'Largest Contentful Paint (LCP) dépasse le seuil optimal (2.5s)',
  },
  defaultIce: {
    impact: 8,
    confidence: 9,
    effort: 6,
    rationale: {
      en: 'Major ranking factor in Google Page Experience; directly impacts bounce rate.',
      fr: 'Signal majeur du Google Page Experience ; impacte directement le taux de rebond.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'LCP <= 2.5s at 75th percentile',
    fr: 'LCP <= 2.5s au 75e percentile',
  },
};

export const RULE_PERF_02: RuleDefinition = {
  id: 'R-PERF-02',
  category: 'performance',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://web.dev/articles/inp',
  title: {
    en: 'Interaction to Next Paint (INP) exceeds recommended threshold',
    fr: 'Interaction to Next Paint (INP) dépasse le seuil optimal (200ms)',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 5,
    rationale: {
      en: 'Evaluates page responsiveness to user clicks and taps.',
      fr: 'Évalue la réactivité de la page aux clics et interactions utilisateur.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'INP <= 200ms at 75th percentile',
    fr: 'INP <= 200ms au 75e percentile',
  },
};

export const RULE_PERF_03: RuleDefinition = {
  id: 'R-PERF-03',
  category: 'performance',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl: 'https://web.dev/articles/cls',
  title: {
    en: 'Cumulative Layout Shift (CLS) exceeds recommended threshold',
    fr: 'Cumulative Layout Shift (CLS) dépasse le seuil optimal (0.1)',
  },
  defaultIce: {
    impact: 7,
    confidence: 9,
    effort: 7,
    rationale: {
      en: 'Prevents annoying layout shifts while the page loads.',
      fr: 'Évite les sauts visuels déstabilisants pendant le chargement.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'CLS <= 0.1 at 75th percentile',
    fr: 'CLS <= 0.1 au 75e percentile',
  },
};

export const RULE_PERF_04: RuleDefinition = {
  id: 'R-PERF-04',
  category: 'performance',
  defaultSeverity: 'medium',
  blocksIndexing: false,
  officialSourceUrl: 'https://web.dev/articles/ttfb',
  title: {
    en: 'Time to First Byte (TTFB) exceeds recommended threshold',
    fr: 'Time to First Byte (TTFB) dépasse le seuil optimal (800ms)',
  },
  defaultIce: {
    impact: 6,
    confidence: 8,
    effort: 6,
    rationale: {
      en: 'Pre-requisite for fast LCP; reflects server response and edge caching efficiency.',
      fr: 'Pré-requis pour un LCP rapide ; reflète la performance serveur et le cache CDN.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: 'TTFB <= 800ms at 75th percentile',
    fr: 'TTFB <= 800ms au 75e percentile',
  },
};

export const PERF_RULES: ReadonlyArray<RuleDefinition> = [
  RULE_PERF_01,
  RULE_PERF_02,
  RULE_PERF_03,
  RULE_PERF_04,
];

export function evaluatePerfRules(
  cwvMetrics?: ReadonlyArray<CwvMetricRecord>,
): ReadonlyArray<Finding> {
  if (!cwvMetrics || cwvMetrics.length === 0) {
    return [];
  }

  const findings: Finding[] = [];

  for (const m of cwvMetrics) {
    const subjectRef = `${m.url}#${m.formFactor.toLowerCase()}`;

    // R-PERF-01: LCP
    if (m.lcpRating && m.lcpRating !== 'good' && m.lcpMs != null) {
      findings.push(
        createFindingFromRule(RULE_PERF_01, {
          subjectRef: `${subjectRef}#lcp`,
          evidence: {
            source: 'cwv',
            filePath: '',
            lineNumber: 0,
            url: m.url,
            observed: `LCP p75 is ${m.lcpMs}ms (${m.lcpRating}) on ${m.formFactor} (scope: ${m.scope})`,
            expected: 'LCP p75 <= 2500ms (good)',
          },
          remediation: {
            en: 'Optimize hero element rendering: compress and preload hero image, minimize render-blocking CSS/JS, and leverage caching.',
            fr: 'Optimiser l élément principal LCP : compresser et précharger l image vedette, éliminer le CSS/JS bloquant et activer le cache.',
          },
          customIce: {
            impact: m.lcpRating === 'poor' ? 9 : 7,
            confidence: 9,
            effort: 6,
          },
        }),
      );
    }

    // R-PERF-02: INP
    if (m.inpRating && m.inpRating !== 'good' && m.inpMs != null) {
      findings.push(
        createFindingFromRule(RULE_PERF_02, {
          subjectRef: `${subjectRef}#inp`,
          evidence: {
            source: 'cwv',
            filePath: '',
            lineNumber: 0,
            url: m.url,
            observed: `INP p75 is ${m.inpMs}ms (${m.inpRating}) on ${m.formFactor} (scope: ${m.scope})`,
            expected: 'INP p75 <= 200ms (good)',
          },
          remediation: {
            en: 'Break up long tasks on main thread, yield with scheduler.yield() or requestAnimationFrame, and optimize event listeners.',
            fr: 'Découper les tâches longues du thread principal, utiliser scheduler.yield() et optimiser les écouteurs d événements.',
          },
          customIce: {
            impact: m.inpRating === 'poor' ? 8 : 6,
            confidence: 9,
            effort: 5,
          },
        }),
      );
    }

    // R-PERF-03: CLS
    if (m.clsRating && m.clsRating !== 'good' && m.clsScore != null) {
      findings.push(
        createFindingFromRule(RULE_PERF_03, {
          subjectRef: `${subjectRef}#cls`,
          evidence: {
            source: 'cwv',
            filePath: '',
            lineNumber: 0,
            url: m.url,
            observed: `CLS p75 is ${m.clsScore} (${m.clsRating}) on ${m.formFactor} (scope: ${m.scope})`,
            expected: 'CLS p75 <= 0.1 (good)',
          },
          remediation: {
            en: 'Add explicit width and height to images, reserve space for dynamic widgets and banner ads.',
            fr: 'Définir les attributs width et height sur toutes les images et réserver l espace des blocs dynamiques.',
          },
          customIce: {
            impact: m.clsRating === 'poor' ? 8 : 6,
            confidence: 9,
            effort: 7,
          },
        }),
      );
    }

    // R-PERF-04: TTFB
    if (m.ttfbRating && m.ttfbRating !== 'good' && m.ttfbMs != null) {
      findings.push(
        createFindingFromRule(RULE_PERF_04, {
          subjectRef: `${subjectRef}#ttfb`,
          evidence: {
            source: 'cwv',
            filePath: '',
            lineNumber: 0,
            url: m.url,
            observed: `TTFB p75 is ${m.ttfbMs}ms (${m.ttfbRating}) on ${m.formFactor} (scope: ${m.scope})`,
            expected: 'TTFB p75 <= 800ms (good)',
          },
          remediation: {
            en: 'Improve server response time with edge caching, reverse proxy CDN, and query optimization.',
            fr: 'Améliorer le temps de réponse serveur avec du cache edge/CDN et optimiser les requêtes backend.',
          },
          customIce: {
            impact: m.ttfbRating === 'poor' ? 7 : 5,
            confidence: 8,
            effort: 6,
          },
        }),
      );
    }
  }

  return findings;
}
