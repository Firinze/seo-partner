import React from 'react';

export const metadata = {
  title: 'Agences SEO Local & Technique | Plateforme Example Pro',
  description: 'Optimisez votre visibilite organique, votre fiche Google Business Profile et vos performances techniques avec des audits deterministes verifies sur mesure.',
  alternates: {
    canonical: 'https://example.com/',
  },
  openGraph: {
    title: 'Agences SEO Local & Technique | Plateforme Example Pro',
    description: 'Optimisez votre visibilite organique avec des audits deterministes.',
  },
};

export default function HomePage() {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Example Pro',
    url: 'https://example.com',
  };

  return (
    <main>
      <h1>Plateforme SEO Locale et Technique</h1>
      <p>Bienvenue sur notre plateforme de pilotage SEO.</p>
      <img src="/hero.webp" alt="Tableau de bord SEO Example Pro" width="800" height="450" />
      <a href="/pricing">Voir nos tarifs</a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
    </main>
  );
}

