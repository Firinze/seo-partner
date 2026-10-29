# Cahier des charges : Refonte et Architecture Multi-Framework de SEO Partner
## De la coquille statique au copilote IA universel de bout en bout

**Version** : 2.0  
**Date** : 29 octobre 2026  
**Auteur** : Firinze Gbenito Dossou & Equipe Produit SEO Partner  
**Statut** : Cadrage technique et fonctionnel officiel  

---

## 1. Vision et Objectifs Strategiques

### 1.1. Constat sans complaisance
Le moteur historique de SEO Partner etait base sur un paradigme depasse : un scanner statique regex cherchant des balises HTML `<head>` physiques et inserant des marqueurs aveugles `TODO-SEO`.
Sur un projet moderne :
- Il a ignore la quasi-totalite des pages de code reelles.
- Il a alerte a tort sur des pages de back-office privees.
- Il n'a apporte aucune plus-value editoriale ou strategique.

En 2026, un audit SEO ne peut pas se resumer a compter des balises absentes. Le SEO moderne exige :
1. La comprehension du modele economique du site et de son offre.
2. L'identification fine de l'intention de recherche par page.
3. La distinction automatique entre pages publiques d'acquisition et interfaces applicatives privees.
4. L'optimisation pour les moteurs traditionnels (Google, Bing) et pour les moteurs generatifs (AI Overviews, ChatGPT Search, Perplexity).

### 1.2. Le principe fondateur : L'Agent IA comme Cerveau
L'Agent IA est le centre nevralgique de SEO Partner.
- Les parseurs de code (AST, analyseurs de routes, crawlers HTTP) sont les **yeux et les mains** du systeme.
- L'Agent IA (qu'il soit heberge dans l'IDE du developpeur via le protocole MCP ou execute via une cle API directe) est le **cerveau**.
- Aucune modification de code ne doit comporter de marqueur `TODO-SEO` : l'agent doit lire le contexte, comprendre le sujet de la page et generer du code et des textes prets pour la production.

---

## 2. Detection Universelle et Agnostique de l'Architecture

Les structures de projets ne sont ni figees ni uniformes. Un outil d'elite ne depend pas de conventions de nommage arbitraires (comme un dossier qui s'appellerait obligatoirement `(dashboard)` ou `(public)`). Il croise plusieurs sources de verite directement dans le code.

### 2.1. Analyse directe du code source et de la logique applicative
L'outil inspecte les fichiers de code pour en deduire la nature :
- **Pages d'acquisition (Publiques)** : Presence de textes marketing, de titres d'accroche, de tarification, d'articles de blog, de foires aux questions, d'appels a l'action vers l'inscription ou la prise de contact.
- **Pages applicatives (Privees)** : Presence de formulaires de modification de profil, de tables de gestion de donnees internes, de composants d'administration, de boutons de deconnexion, d'appels d'API proteges par session ou jeton JWT.
- **Gardes de securite dans le code** : Detection des verifications d'authentification directes :
  - Next.js / React : `auth()`, `getServerSession()`, `useUser()`, `useSession()`, `redirect('/login')`.
  - Laravel : `$this->middleware('auth')`, `auth()->user()`, `Gate::authorize()`.
  - Django : `@login_required`, `LoginRequiredMixin`, `request.user.is_authenticated`.
  - Symfony : `IsGranted('ROLE_USER')`, `denyAccessUnlessGranted()`.

### 2.2. Analyse des regles de routage, proxys et serveurs
L'outil ne se limite pas a chercher un fichier `middleware.ts`. Il analyse la couche reseau et d'aiguillage declaree dans le depot :
- **Reverse Proxys et Passerelles** : Configuration Nginx (`nginx.conf`), Caddyfile, Traefik, Apache (`.htaccess`), Cloudflare Pages / Workers routing rules.
- **Fichiers de reconfiguration de routes** :
  - `next.config.js` / `next.config.mjs` : sections `redirects()`, `rewrites()`, `headers()`.
  - `nuxt.config.ts` : route rules, redirects et nitro proxies.
  - `astro.config.mjs` : redirects et configuration de build SSR/SSG.
  - `svelte.config.js` et `hooks.server.ts` : interception des requetes entrantes.
- **Tables de routage** :
  - Laravel : `routes/web.php`, `routes/api.php`, groupes de middleware de route.
  - Django : `urls.py`, `path()`, inclusions d'applications internes.
  - Symfony : `config/routes.yaml` et attributs PHP `#[Route]`.

### 2.3. Gestion stricte du perimetre d'indexation (Public vs Prive)
Toute page detectee comme privee ou necessitant une session utilisateur :
- **Ne fait l'objet d'aucune alerte de manque de meta description ou de title public**.
- **Doit comporter une directive stricte d'exclusion** : entete HTTP `X-Robots-Tag: noindex, nofollow` ou balise meta `noindex, nofollow`.
- **Est automatiquement exclue du fichier sitemap.xml**.

---

## 3. Matrice de Support Multi-Framework et Multi-Langage

SEO Partner doit agir avec precision selon la syntaxe et les idiomes exacts du langage utilise sur le projet.

### 3.1. Next.js (TypeScript / JavaScript - App Router & Pages Router)
- **App Router (`app/`)** :
  - Ingestion et ecriture des objets `export const metadata: Metadata = { ... }`.
  - Prise en charge des fonctions dynamiques `export async function generateMetadata({ params })`.
  - Creation native de `app/robots.ts` retournant `MetadataRoute.Robots`.
  - Creation native de `app/sitemap.ts` retournant `MetadataRoute.Sitemap`.
  - Prise en charge de `app/manifest.ts` et `app/opengraph-image.tsx`.
  - Traitement des pages `'use client'` : extraction de la logique cliente dans un sous-composant dedie pour preserver un composant serveur racine capable d'exporter les metadonnees.
- **Pages Router (`pages/`)** :
  - Utilisation du composant natif `next/head`.
  - Verification de `_document.tsx` et `_app.tsx`.

### 3.2. Nuxt 3 & Vue (TypeScript / JavaScript)
- Ingestion et ecriture des composables officiels : `useSeoMeta()` et `useHead()`.
- Configuration de `@nuxtjs/sitemap` et `@nuxtjs/robots` dans `nuxt.config.ts`.
- Prise en charge du rendu hybride (SSR, prerender, client-only).

### 3.3. Astro (TypeScript / JavaScript)
- Injection dans le frontmatter des composants `.astro` (`title`, `description`, `canonical`).
- Utilisation des composants de mise en page racines (`Layout.astro`).
- Integration du plugin `@astrojs/sitemap`.

### 3.4. SvelteKit (TypeScript / JavaScript)
- Injection dans les blocs `<svelte:head>` de chaque composant `+page.svelte`.
- Prise en charge des donnees remontees par `+page.server.ts`.
- Generation dynamique du sitemap via une route `+server.ts` sous `/sitemap.xml`.

### 3.5. Remix & React Router v7 (TypeScript / JavaScript)
- Injection de la fonction `export const meta: MetaFunction = () => [ ... ]`.
- Gestion des metadonnees dynamiques basees sur les donnees de `loader`.

### 3.6. Laravel (PHP)
- Extraction et ecriture des balises dans les vues Blade (`resources/views/`).
- Prise en charge des sections `@section('title')` et `@section('meta')`.
- Generation de sitemap via package standard (ex. `spatie/laravel-sitemap`) ou commande console artisan.
- Inspection de `routes/web.php` pour cartographier toutes les routes publiques.

### 3.7. Symfony (PHP)
- Injection dans les gabarits Twig (`templates/`) via `{% block title %}` et `{% block meta %}`.
- Lecture des attributs de controleurs PHP `#[Route('/url', name: '...')]`.
- Configuration de l'exclusion des pare-feux dans `security.yaml`.

### 3.8. Django (Python)
- Injection dans les templates Django (`templates/base.html`, blocs de contenu).
- Cartographie des chemins dans `urls.py`.
- Utilisation du module natif `django.contrib.sitemaps`.
- Lecture des mixins de vue (`TemplateView`, `DetailView`).

### 3.9. WordPress (PHP & Headless)
- Inspection de la presence des extensions d'autorite : Yoast SEO, Rank Math, SEOPress.
- En mode CMS classique : inspection des hooks `wp_head`, `header.php` et templates de theme.
- En mode Headless (WP + Next.js/Frontity) : synchronisation des meta GraphQL/REST avec le frontend.

### 3.10. Applications SPA (Vite, Create-React-App, Vue CLI)
- Diagnostic des problemes d'indexation lies au rendu purement client (CSR).
- Recommandation et mise en place d'outils de pre-rendu statique ou d'entetes HTTP adaptes.

---

## 4. Moteur de Redaction et Generation Intelligente (Fin de TODO-SEO)

### 4.1. Protocole de lecture semantique
Avant d'ecrire une seule ligne de code, l'Agent IA analyse :
1. Le titre principal (`<h1>`) et les intertitres (`<h2>`).
2. Le paragraphe d'introduction et la proposition de valeur.
3. Les entites nommees (produits, services, localites, marques).
4. Le public cible et le ton du site.

### 4.2. Standards de generation de contenu SEO
- **Balise Title** :
  - Longueur stricte : 50 a 60 caracteres.
  - Structure : `[Mot-cle principal] - [Benefice utilisateur ou specification] | [Marque]`.
  - Format 100 % redige, unique par page.
- **Balise Meta Description** :
  - Longueur stricte : 140 a 155 caracteres.
  - Structure : Resume accrocheur contenant le mot-cle secondaire, terminant par un verbe d'action incitant au clic.
- **URL Canonique** :
  - Format absolu base sur le domaine racine configure ou detecte.
- **Balises OpenGraph et Twitter Cards** :
  - Generation de `og:title`, `og:description`, `og:type`, `og:image`, `twitter:card`.

### 4.3. Comportement en mode hors-connexion (sans cle API)
Si l'utilisateur execute une commande sans agent IDE et sans cle API configuree :
- L'outil n'ecrit JAMAIS `TODO-SEO`.
- Il extrait le premier titre `<h1>` pour le title.
- Il extrait les 150 premiers caracteres du premier paragraphe significatif pour la meta description.
- Il notifie le developpeur : *« Metadonnees initiales extraites du texte visible. Connectez l'agent IA pour une reformulation optimisee pour la conversion. »*

---

## 5. Architecture Editoriale et Strategie de Blog

Une application web sans contenu editorial ne peut pas developper son autorite ni capter de trafic d'intention informationnelle.

### 5.1. Audit de la presence d'une section editoriale
L'outil verifie la presence d'une structure de publication d'articles ou de guides :
- Absence constatee : Alerte strategique majeure dans le rapport.
- Analyse thematique du site pour proposer un plan de developpement de contenu.

### 5.2. Structuration en clusters thematiques (Topic Clusters)
Pour un site donne (ex. application juridique, boutique en ligne, SaaS financier) :
- Definition de la page pilier centrale.
- Proposition de 5 a 10 sujets satellites de longue traine.
- Regles de maillage interne obligatoire (chaque article satellite doit renvoyer vers la page pilier et vers une page de conversion).

### 5.3. Generation automatique de briefs de contenu
L'outil genere dans `docs/seo/briefs/` des cahiers des charges de redaction clairs :
- Mot-cle principal et volume d'intention.
- Structure H2 / H3 recommandee.
- Questions frequemment posees a integrer.
- Appel a l'action final vers le produit.

---

## 6. Donnees Structurees JSON-LD

### 6.1. Selection automatique du schema Schema.org
L'Agent IA determine la nature de l'entite :
- Site d'entreprise / organisation : `Organization`, `WebSite`.
- SaaS ou logiciel : `SoftwareApplication`.
- Commerce / Vente en ligne : `Product`, `Offer`.
- Etablissement local : `LocalBusiness`, `PostalAddress`, `OpeningHoursSpecification`.
- Guides et tutoriels : `Article`, `HowTo`, `FAQPage`.

### 6.2. Injection de code fidele au contenu visible
- Respect absolu des directives Google : aucune donnee invisible ou inventee.
- Injection dans le format JSON-LD standardise selon le framework (ex. composant TypeScript ou script dans le template).

---

## 7. Moteurs Generatifs et Visibilite IA (GEO)

L'optimisation pour les reponses des intelligences artificielles (Google AI Overviews, Perplexity, ChatGPT Search) obeit a des regles precises :
1. **Structure Reponse Directe** : Insertion de syntheses claires en 2 a 3 phrases repondant directement a la requete cible sous le H2.
2. **Tableaux comparatifs et listes ordonnees** : Formats facilement interpretables par les extracteurs de reponses IA.
3. **Citations de sources et donnees d'autorite** : Integration de chiffres clairs et de liens d'autorite renforçant le signal E-E-A-T.

---

## 8. Parcours Utilisateur, CLI et Dashboard

### 8.1. Initialisation transparente (`seo-partner init`)
- L'outil inspecte l'environnement sans poser de questions inutiles.
- Sortie claire en 4 etapes :
  1. Framework detecte (version, arborescence, langage).
  2. IDE detecte et configuration MCP terminee (Cursor, Claude Desktop, Antigravity, VS Code).
  3. Skill installe dans le repertoire dedie de l'IDE.
  4. Perimetre d'indexation initialise (`seo-partner.config.json`).

### 8.2. Commande d'audit enrichie (`seo-partner audit`)
- Affichage d'un tableau de synthese clair dans la console (Top 5 des priorites ICE).
- Ecriture automatique du rapport detaille dans `docs/seo/AAAA-MM-JJ-audit.md`.

### 8.3. Dashboard local fluide (`seo-partner serve`)
- Suppression de tout rechargement brutal de page.
- Ajout d'une barre de progression dynamique lors de l'exploration (Crawl).
- Guide pas a pas pour la connexion des donnees reelles de la Google Search Console.
- Panneau d'explication de l'utilisation de l'IA (distinction claire entre l'utilisation gratuite via l'agent MCP de l'IDE et l'utilisation de cle API directe).

---

## 9. Plan de Mise en Oeuvre et Priorites

| Phase | Intitule | Livrables techniques |
| :--- | :--- | :--- |
| **Phase 1** | **Patcher Intelligent Next.js & Multi-Framework** | Remplacement de la detection HTML par le support direct de `export const metadata` (TSX), gestion de `app/robots.ts` et `app/sitemap.ts`. |
| **Phase 2** | **Suppression Definitive de `TODO-SEO`** | Integration de la generation contextuelle (lecture H1/paragraphes et redaction directe par IA). |
| **Phase 3** | **Detection Resiliente Public vs Prive** | Analyse multi-signaux (code, auth, proxys, middleware, regles serveur). |
| **Phase 4** | **Adapters Multi-Frameworks Complets** | Prise en charge native de Nuxt, Astro, SvelteKit, Laravel, Django, Symfony. |
| **Phase 5** | **Strategie Editoriale & GEO** | Module d'audit d'absence de blog, generation de briefs de contenu et optimisation IA. |
| **Phase 6** | **Ergonomie CLI & Dashboard** | Rapport Markdown systematique, retours visuels temps reel pendant le crawl. |
