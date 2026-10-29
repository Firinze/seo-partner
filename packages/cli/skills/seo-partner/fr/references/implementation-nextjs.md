# Guide de Référence : Implémentation SEO Next.js (App Router & Pages Router)

## 1. Métadonnées Typées (App Router)

Dans `src/app/**/page.tsx`, toujours exporter `metadata` (statique) ou `generateMetadata` (dynamique) depuis un **Server Component** :

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Titre Unique Orienté Intention | Marque',
  description: 'Description unique de 150 à 160 caractères résumant la proposition de valeur et incitant au clic.',
  alternates: {
    canonical: 'https://example.com/ma-page',
  },
  openGraph: {
    title: 'Titre Unique Orienté Intention | Marque',
    description: 'Description unique...',
    url: 'https://example.com/ma-page',
    type: 'website',
  },
};
```

**Piège classique (`R-TECH-06`)** : un fichier `page.tsx` commençant par `'use client'` ne peut pas exporter `metadata` ni `generateMetadata`. Toujours garder `page.tsx` en Server Component et déléguer l'interactivité à des sous-composants clients.

## 2. `robots.ts` et `sitemap.ts` Dynamiques

- Définir `src/app/robots.ts` (ou `public/robots.txt`) en excluant `/api/`, `/dashboard/`, `/admin/`.
- Définir `src/app/sitemap.ts` (ou `public/sitemap.xml`) en n'incluant que les routes publiques canoniques.

## 3. Données Structurées JSON-LD

Injecter le JSON-LD dans le Server Component via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />` en vérifiant systématiquement la présence de `@context: "https://schema.org"` et `@type`.

