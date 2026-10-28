# Reference Guide: Next.js SEO Implementation (App Router & Pages Router)

## 1. Typed Metadata API (App Router)

In `src/app/**/page.tsx`, always export `metadata` (static) or `generateMetadata` (dynamic) from a **Server Component**:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unique Intent-Driven Title | Brand',
  description: 'Unique 150–160 character description summarizing the value proposition with a clear call to action.',
  alternates: {
    canonical: 'https://example.com/my-page',
  },
  openGraph: {
    title: 'Unique Intent-Driven Title | Brand',
    description: 'Unique description...',
    url: 'https://example.com/my-page',
    type: 'website',
  },
};
```

**Common pitfall (`R-TECH-06`)**: A `page.tsx` file marked with `'use client'` cannot export `metadata` or `generateMetadata`. Keep `page.tsx` as a Server Component and move interactive state into child client components.

## 2. Dynamic `robots.ts` & `sitemap.ts`

- Define `src/app/robots.ts` (or `public/robots.txt`) disallowing `/api/`, `/dashboard/`, `/admin/`.
- Define `src/app/sitemap.ts` (or `public/sitemap.xml`) including only canonical public routes.

## 3. JSON-LD Structured Data

Render JSON-LD inside Server Components via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />`, ensuring `@context: "https://schema.org"` and `@type` are always valid.

