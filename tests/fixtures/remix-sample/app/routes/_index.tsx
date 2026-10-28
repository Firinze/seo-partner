import React from 'react';

export const meta = () => [
  { title: "Accueil Remix" },
  { name: "description", content: "Plateforme web moderne construite avec Remix" },
];

export default function Index() {
  return (
    <div>
      <h1>Bienvenue sur Remix</h1>
      <p>Performance et résilience web.</p>
      <a href="/about">En savoir plus</a>
      <a href="/blog/hello-world">Article Hello World</a>
    </div>
  );
}

