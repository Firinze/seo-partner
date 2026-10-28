import React from 'react';
import Head from 'next/head';

export default function IndexPage() {
  return (
    <>
      <Head>
        <title>Guide Complet du Referencement Technique en 2026 | Blog</title>
        <meta
          name="description"
          content="Decouvrez toutes les etapes essentielles pour auditer l indexation, le maillage interne et les donnees structurees JSON-LD de votre site web en production."
        />
        <link rel="canonical" href="https://blog.example.com/" />
      </Head>
      <main>
        <h1>Guide du Referencement Technique</h1>
        <img src="/guide.jpg" alt="Schema d architecture SEO" width="640" height="360" />
      </main>
    </>
  );
}

