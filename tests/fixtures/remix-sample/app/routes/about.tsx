import React from 'react';

export const meta = () => [
  { title: "À propos de nous - Remix" },
  { name: "description", content: "Découvrez l'équipe et la mission derrière notre projet" },
];

export default function About() {
  return (
    <div>
      <h1>À propos de notre entreprise</h1>
      <p>Experts en développement web moderne.</p>
    </div>
  );
}

