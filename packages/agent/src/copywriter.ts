import type { PageSemantics } from './semantic-extractor.js';

export interface CopywriterOptions {
  semantics: PageSemantics;
  brandName?: string;
  brandAlreadyInLayout?: boolean;
  targetKeywords?: string[];
  lang?: 'fr' | 'en';
}

export interface GeneratedMetadataCopy {
  title: string;
  description: string;
  headingsQuality: {
    hasH1: boolean;
    h2Count: number;
  };
}

export function generateMetadataCopy(options: CopywriterOptions): GeneratedMetadataCopy {
  const { semantics, brandName = '', brandAlreadyInLayout = false, lang = 'fr' } = options;

  const firstH2 = semantics.h2s[0];
  const baseTitle = semantics.h1 ||
    firstH2 ||
    'Solution Experte et Optimisation';

  // Construct Title (aiming for 50-60 characters)
  let title = baseTitle;
  if (!brandAlreadyInLayout && brandName && !title.toLowerCase().includes(brandName.toLowerCase())) {
    const candidate = `${title} | ${brandName}`;
    if (candidate.length <= 60) {
      title = candidate;
    }
  }

  // If title is shorter than 50 chars, enrich with qualifier
  if (title.length < 50) {
    const qualifier = lang === 'fr' ? ' - Guide et Outil' : ' - Complete Guide';
    if (title.length + qualifier.length <= 60) {
      title += qualifier;
    } else {
      const shortQual = lang === 'fr' ? ' - Pro' : ' - Pro';
      title += shortQual;
    }
  }

  // If title is longer than 60 chars, truncate gracefully
  if (title.length > 60) {
    title = title.slice(0, 57).trim() + '...';
  }

  // Construct Description (aiming for 140-155 characters)
  const intro = semantics.valueProposition ||
    (firstH2
      ? `Découvrez nos solutions complètes pour ${firstH2.toLowerCase()}.`
      : 'Découvrez notre solution experte conçue pour démultiplier vos performances.');

  const cta = lang === 'fr'
    ? ' Découvrez notre accompagnement et passez à l\'action dès aujourd\'hui.'
    : ' Discover our expert solution and get started today.';

  let description = `${intro.replace(/[.\s]+$/, '')}.${cta}`;

  // Normalize length to 140-155
  if (description.length < 140) {
    const padding = lang === 'fr'
      ? ' Profitez d\'une analyse approfondie et sur mesure.'
      : ' Benefit from comprehensive and tailored guidance.';
    if (description.length + padding.length <= 160) {
      description = `${description.replace(/[.\s]+$/, '')}.${padding}`;
    }
  }

  if (description.length > 155) {
    description = description.slice(0, 152).trim() + '...';
  }

  return {
    title,
    description,
    headingsQuality: {
      hasH1: Boolean(semantics.h1),
      h2Count: semantics.h2s.length,
    },
  };
}
