import React from 'react';

export const meta = ({ data }: { data?: { title?: string } }) => [
  { title: data?.title || "Article de Blog - Remix" },
  { name: "description", content: "Détail de notre publication" },
];

export default function BlogPost() {
  return (
    <div>
      <h1>Détail de l'article Remix</h1>
      <p>Contenu du post.</p>
    </div>
  );
}

