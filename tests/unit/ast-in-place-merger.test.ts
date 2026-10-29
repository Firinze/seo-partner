import { describe, it, expect } from 'vitest';
import {
  mergePageMetadataInPlace,
  extractLayoutTitleTemplate,
  sanitizePageTitleForLayout,
} from '../../packages/adapters/src/index.js';

describe('AST In-Place Merger & Title Layout Resolver (US3)', () => {
  it('enriches an existing metadata object in-place without duplicating export', () => {
    const existingCode = `
      import type { Metadata } from 'next';

      export const metadata: Metadata = {
        title: 'Accueil',
      };

      export default function HomePage() {
        return <h1>Bienvenue</h1>;
      }
    `;

    const result = mergePageMetadataInPlace(existingCode, {
      description: 'Decouvrez notre plateforme innovante des maintenant.',
      canonical: 'https://example.com/',
      openGraph: {
        title: 'Accueil | Plateforme',
        description: 'Decouvrez notre plateforme innovante.',
      },
    });

    expect(result.modified).toBe(true);
    expect(result.hasComplexDynamicLogic).toBe(false);

    // Title should still be preserved
    expect(result.mergedCode).toContain("title: 'Accueil'");
    // Description should be injected inside the existing object
    expect(result.mergedCode).toContain("description: 'Decouvrez notre plateforme innovante des maintenant.'");
    // Alternates canonical should be injected
    expect(result.mergedCode).toContain("canonical: 'https://example.com/'");

    // Must have exactly ONE occurrence of export const metadata
    const exportCount = (result.mergedCode.match(/export\s+const\s+metadata/g) ?? []).length;
    expect(exportCount).toBe(1);
  });

  it('detects complex generateMetadata functions and flags them safely without touching code', () => {
    const code = `
      export async function generateMetadata({ params }): Promise<Metadata> {
        const data = await fetch(\`https://api.example.com/items/\${params.id}\`).then(r => r.json());
        return {
          title: data.name,
        };
      }
    `;

    const result = mergePageMetadataInPlace(code, {
      description: 'Tentative de modification automatique',
    });

    expect(result.modified).toBe(false);
    expect(result.hasComplexDynamicLogic).toBe(true);
    expect(result.mergedCode).toBe(code);
  });

  it('detects title template in root layout and strips redundant brand name from page title', () => {
    const layoutCode = `
      export const metadata = {
        title: {
          default: 'Ceilow',
          template: '%s | Ceilow',
        },
      };
    `;

    const template = extractLayoutTitleTemplate(layoutCode);
    expect(template?.brandName).toBe('Ceilow');

    const sanitized = sanitizePageTitleForLayout('Tarifs et Formules | Ceilow', template);
    expect(sanitized).toBe('Tarifs et Formules');

    const alreadyClean = sanitizePageTitleForLayout('Contactez-nous', template);
    expect(alreadyClean).toBe('Contactez-nous');
  });
});

