import React from 'react';

export const metadata = {
  title: 'Tarifs',
  description: 'Nos tarifs.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function PricingPage() {
  const brokenSchema = {
    '@context': 'https://schema.org',
    name: 'Missing Type Schema',
  };

  return (
    <main>
      <h1>Grille Tarifaire</h1>
      <h1>Second Titre H1 en Doublon</h1>
      <img src="/pricing-table.png" width="600" height="400" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brokenSchema) }}
      />
    </main>
  );
}

