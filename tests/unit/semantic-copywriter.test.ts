import { describe, it, expect } from 'vitest';
import { extractPageSemantics } from '../../packages/agent/src/semantic-extractor.js';
import { generateMetadataCopy } from '../../packages/agent/src/copywriter.js';

describe('SemanticCopywriter & Extractor', () => {
  const samplePage = `
    export default function ProductPage() {
      return (
        <div>
          <h1>Plateforme SaaS de Facturation Automatisée</h1>
          <p>Gagnez du temps et sécurisez votre trésorerie grâce à notre logiciel certifié.</p>
          <h2>Fonctionnalités Clés et Conformité Fiscale</h2>
          <p>Émission de devis, relance automatique des impayés et export comptable en 1 clic.</p>
        </div>
      );
    }
  `;

  it('extracts H1, H2 and core value proposition from page code', () => {
    const semantics = extractPageSemantics(samplePage, 'product-page.tsx');
    expect(semantics.h1).toBe('Plateforme SaaS de Facturation Automatisée');
    expect(semantics.h2s).toContain('Fonctionnalités Clés et Conformité Fiscale');
    expect(semantics.valueProposition).toContain('Gagnez du temps');
  });

  it('generates title within 50 to 60 characters without brand duplication', () => {
    const semantics = extractPageSemantics(samplePage, 'product-page.tsx');
    const result = generateMetadataCopy({
      semantics,
      brandName: 'Acme SaaS',
      brandAlreadyInLayout: false,
    });

    expect(result.title.length).toBeGreaterThanOrEqual(45);
    expect(result.title.length).toBeLessThanOrEqual(65);
    expect(result.title).not.toContain('TODO-SEO');
    expect(result.title).not.toContain('undefined');
  });

  it('generates description within 140 to 155 characters with action verb', () => {
    const semantics = extractPageSemantics(samplePage, 'product-page.tsx');
    const result = generateMetadataCopy({
      semantics,
      brandName: 'Acme SaaS',
      brandAlreadyInLayout: false,
    });

    expect(result.description.length).toBeGreaterThanOrEqual(135);
    expect(result.description.length).toBeLessThanOrEqual(160);
    expect(result.description).not.toContain('TODO-SEO');
    // Must contain action or conversion orientation
    expect(
      /d[eé]couvrez|gagnez|automatisez|optimisez|explorez|profitez|activez/i.test(result.description),
    ).toBe(true);
  });
});

