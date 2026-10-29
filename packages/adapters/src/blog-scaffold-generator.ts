import type { FrameworkType } from '@seo-partner/core';

export interface BlogScaffoldFile {
  relativePath: string;
  code: string;
  description: string;
}

export function generateBlogScaffold(
  framework: FrameworkType,
  pillarTitle = 'Actualités et Guides SEO',
): BlogScaffoldFile[] {
  switch (framework) {
    case 'next_app':
      return [
        {
          relativePath: 'app/blog/page.tsx',
          code: `import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '${pillarTitle} | Blog',
  description: 'Découvrez nos guides d\\\'experts et analyses approfondies.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogIndexPage() {
  return (
    <main className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">${pillarTitle}</h1>
      <p className="text-gray-600 mb-6">Explorez nos articles et guides complets pour approfondir vos compétences.</p>
    </main>
  );
}
`,
          description: 'Page d\'index du blog Next.js App Router',
        },
        {
          relativePath: 'app/blog/[slug]/page.tsx',
          code: `import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: \`Article: \${params.slug} | Blog\`,
    description: 'Guide complet et recommandations pratiques.',
  };
}

export default function BlogPostPage({ params }: Props) {
  return (
    <article className="max-w-3xl mx-auto py-12 px-4 prose">
      <h1>Détail de l\\\'article : {params.slug}</h1>
    </article>
  );
}
`,
          description: 'Route dynamique d\'article Next.js App Router',
        },
      ];

    case 'nuxt':
      return [
        {
          relativePath: 'pages/blog/index.vue',
          code: `<script setup lang="ts">
useSeoMeta({
  title: '${pillarTitle} | Blog',
  description: 'Guides d\\\'experts et ressources pratiques.',
});
</script>

<template>
  <main class="blog-index">
    <h1>${pillarTitle}</h1>
  </main>
</template>
`,
          description: 'Page d\'index du blog Nuxt 3',
        },
      ];

    case 'astro':
      return [
        {
          relativePath: 'src/pages/blog/index.astro',
          code: `---
const pageTitle = "${pillarTitle}";
---
<html>
  <head>
    <title>{pageTitle}</title>
    <meta name="description" content="Guides et analyses éditoriales d\\\'experts." />
  </head>
  <body>
    <main>
      <h1>{pageTitle}</h1>
    </main>
  </body>
</html>
`,
          description: 'Page d\'index du blog Astro',
        },
      ];

    case 'laravel':
      return [
        {
          relativePath: 'resources/views/blog/index.blade.php',
          code: `@extends('layouts.app')

@section('title', '${pillarTitle}')

@push('meta')
  <meta name="description" content="Retrouvez nos guides et articles spécialisés.">
@endpush

@section('content')
  <div class="container py-5">
    <h1>${pillarTitle}</h1>
  </div>
@endsection
`,
          description: 'Vue d\'index du blog Laravel Blade',
        },
      ];

    default:
      return [
        {
          relativePath: 'blog/index.php',
          code: `<?php
$pageTitle = '${pillarTitle}';
$metaDescription = 'Guides et ressources d\\\'experts.';
require_once __DIR__ . '/../includes/header.php';
?>
<main class="container">
  <h1><?php echo htmlspecialchars($pageTitle); ?></h1>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
`,
          description: 'Script d\'index du blog PHP',
        },
      ];
  }
}

