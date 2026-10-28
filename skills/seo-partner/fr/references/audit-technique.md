# Guide de Référence : Audit Technique SEO

## 1. Exploration et Contrôle (`robots.txt` & `sitemap.xml`)

- **`robots.txt` (`R-TECH-01`)** : Doit être accessible à la racine (`/robots.txt`), retourner un code 200, ne jamais bloquer les ressources CSS/JS indispensables au rendu, et déclarer l'URL absolue du `Sitemap:`.
- **`sitemap.xml` (`R-TECH-02`, `R-TECH-04`)** : Ne doit contenir que des URL canoniques, publiques, indexables (statut 200). Toute route privée (`/admin`, `/dashboard`, `/login`, `/api`, `/checkout`) doit en être strictement exclue.

## 2. Indexation et Balises Canoniques

- **Directives `robots` (`R-TECH-03`)** : Vérifier qu'aucune page publique stratégique ne comporte `noindex` (souvent oublié après une mise en préproduction).
- **URL Canonique (`R-TECH-05`)** : Chaque page publique doit déclarer une URL canonique explicite et cohérente (éviter les boucles et les variantes avec paramètres de tracking).
- **Redirections et Authentification** : Aucune page publique ne doit rediriger un robot d'indexation vers une page de connexion (`302 /login`).

## 3. Rendu et Performance (Core Web Vitals)

- **Rendu Serveur vs Client (`R-TECH-06`)** : Les pages publiques doivent exposer leur contenu principal et leurs métadonnées (`<title>`, `<meta name="description">`, `<link rel="canonical">`, `<h1>`) dès la réponse HTML initiale (SSR/SSG).
- **Core Web Vitals** :
  - **LCP (Largest Contentful Paint)** : `<= 2.5 s`
  - **INP (Interaction to Next Paint)** : `<= 200 ms`
  - **CLS (Cumulative Layout Shift)** : `<= 0.1` (toujours renseigner `width` et `height` sur les images).

