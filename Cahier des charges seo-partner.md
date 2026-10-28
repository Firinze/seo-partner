# Cahier des charges : seo-partner (nom de travail)

Version 1.0 (brouillon à valider) | 28 octobre 2026 | Auteur : Firinze Gbènito Dossou (Leadbooster)

## 1. Résumé décisionnel

Transformer le skill SEO actuel en produit open source complet : un index local déterministe du projet (10 000 fichiers et plus), un crawl du site en ligne, un moteur d'audit avec priorisation ICE, un serveur MCP pour les agents des IDE (ou un mode autonome avec clé API), une CLI d'installation et un dashboard web local.

Trois priorités : (1) socle Next.js + crawl générique, puis écosystème PHP (Laravel, Symfony, PHP natif / Laragon) ; (2) installation en une commande sur au moins 3 IDE ; (3) mémoire persistante dans `.seo/` au lieu du contexte du modèle.

Impact attendu : premier audit exploitable moins de 10 minutes après l'installation. Le succès se mesure en installations réussies et retours d'utilisateurs, jamais en promesses de positionnement.

Décision structurante : TypeScript/Node de bout en bout, un écart assumé avec le défaut FastAPI + Next.js des prompts d'architecture (voir ADR-001).

## 2. Contexte, problème et périmètre

**Problème.** Le skill actuel est un prompt : pas d'index, pas de mémoire durable, pas de données réelles (crawl, Search Console). Il dépend d'éléments propres à un IDE (`search_web`, `ask_question`, `$ARGUMENTS`, chemin `.agents/skills`) et de règles propres à un projet (langue imposée, `pnpm build`, `PROJECT_MEMORY.md`). Il n'est donc ni reproductible ni distribuable.

**Vision.** Un agent SEO qui travaille sur des faits mesurés, vérifiables et conservés dans le dépôt.

**Hypothèses à valider**

- H1 : cible primaire = développeurs et freelances qui utilisent un IDE agentique ou, à défaut, leur propre clé API. Les propriétaires de sites non techniques sont visés après la v1, via le dashboard (décision validée).
- H2 : README et skill en anglais par défaut, variante française.
- H3 : licence MIT, projet open source complet (décision validée).
- H4 : un mainteneur principal au départ, à plein temps.

**Hors périmètre.** Publicité payante, réseaux sociaux, SaaS hébergé multi-utilisateurs, modification du code sans validation explicite, garantie de position ou de délai.

## 3. Utilisateurs et user stories

- **P1 Développeur / freelance** (Next.js, Astro, SPA) : corrige métadonnées, sitemap et JSON-LD depuis son IDE.
- **P2 Consultant / agence** : audite des sites clients (WordPress, Shopify, Wix) en mode crawl et produit des rapports.
- **P3 Contributeur open source** : ajoute un adapter ou une règle.

| ID | User story | Critère d'acceptation |
| --- | --- | --- |
| US1 | P1 installe et initialise l'outil sans piège | Installation globale (`pnpm add -g seo-partner` / `npm i -g seo-partner`, ou `npx` ponctuel), puis `seo-partner init --here --ide <cible>` : détecte l'IDE sans exiger de binaire dans le `PATH` (`--ignore-agent-tools` implicite ou explicite), fusionne sans écraser le projet existant, sécurise `.gitignore` (`.agents/`, `.seo/index.db`) et passe `doctor` au vert en moins de 2 min |
| US2 | P1 scanne un projet de 10 000 fichiers | Terminé en moins de 60 s à froid, `.gitignore` respecté, aucun secret lu |
| US3 | P1 relance après modification de 5 fichiers | Scan incrémental sous 5 s |
| US4 | P1 demande « quelles pages n'ont pas de meta description ? » | L'agent répond via MCP avec fichier et ligne, sans relire les fichiers |
| US5 | P2 crawle un site en ligne | robots.txt respecté, débit configurable, rapport avec statuts, canonical, redirections, hreflang |
| US6 | P1 reçoit un backlog priorisé | Chaque action a score ICE, preuve (fichier+ligne ou URL), responsable, KPI |
| US7 | P1 ouvre le dashboard | `seo-partner dashboard` ouvre une page locale, table de 10 000 lignes fluide |
| US8 | P3 ajoute un adapter | Guide + gabarit + tests de conformité, aucun changement du core |
| US9 | P1 suit les changements de Google | `watch` compare les sources officielles, tout non confirmé est marqué « Rapporté, à vérifier » |
| US10 | P1 vérifie que son code ne sort pas | Mode `--offline` et journal des requêtes sortantes consultable |
| US11 | P2 n'a pas d'agent d'IDE mais une clé API (Anthropic, OpenAI ou Gemini) | seo-partner agent fonctionne avec la clé, coût estimé affiché, plafond de jetons respecté ; sans clé, toutes les commandes déterministes restent utilisables |
| US12 | P1 utilise Claude Code, Codex, Gemini CLI, Cursor ou OpenCode | Le même skill et les mêmes outils MCP donnent des résultats équivalents sur chaque cible (scénarios de test communs) |

## 4. Objectifs et critères de succès

| Indicateur | Cible v1.0 | Mesure |
| --- | --- | --- |
| Installation jusqu'au premier rapport | < 10 min | Test chronométré sur 5 projets réels |
| Scan à froid, 10 000 fichiers | < 60 s | Benchmark CI sur jeu généré |
| Scan incrémental (5 fichiers) | < 5 s | Idem |
| Mémoire maximale pendant un scan | < 1 Go | Idem |
| Installations réussies (`doctor` vert) | >= 90 % sur les IDE supportés | Matrice de tests + retours |
| Faux positifs des règles Must | < 10 % | Revue manuelle de 20 projets |
| Fichiers source envoyés à un tiers sans autorisation explicite | 0 | Test automatisé + journal |
| Couverture de tests du core | >= 80 % | CI |
| Utilisateurs externes ayant lancé un audit complet | >= 10 à 6 mois | Retours, issues, discussions |

Toutes les cibles chiffrées sont des hypothèses à confirmer par benchmark après v0.1.

## 5. Périmètre fonctionnel (MoSCoW)

| Module | Contenu | Priorité | Version |
| --- | --- | --- | --- |
| M1 Skill pack | Skill généralisé + références | Must | v0.1 |
| M2 CLI et installeur | `init`, `doctor`, `scan`, `uninstall` | Must | v0.1 |
| M3 Scanner et index | Rapport JSON puis SQLite incrémental | Must | v0.1 à v0.2 |
| M4 Moteur de règles + ICE | Catalogue de règles, backlog | Must | v0.1 |
| M5 Crawler | HTTP, robots, rendu optionnel | Must | v0.2 |
| M6 Rapports | Markdown, JSON, HTML autonome | Should | v0.2 |
| M7 Dashboard local | Lecture seule d'abord | Should | v0.3 |
| M8 Serveur MCP | Interrogation de l'index par l'agent | Should | v0.4 |
| M9 Connecteurs | Search Console, PageSpeed Insights, Bing WMT | Should | v0.4 |
| M10 Veille | Commande `watch` | Should | v0.4 |
| M11 Adapters supplémentaires | Voir ci-dessous | Should | v0.5 à v1.0 |
| M12 GitHub Action | Audit en CI | Could | v0.5 |
| M13 Rapport à la marque du consultant | White label | Could | après v1.0 |
| M14 Mode autonome | Boucle d'agent interne avec clé API (Anthropic, OpenAI, Gemini), panneau de discussion du dashboard | Should | v0.6 |
| M15 Parcours non techniques | Installation guidée et actions depuis le dashboard, sans passer par un IDE | Could | après v1.0 |

**Technologies à supporter (ordre d'implémentation)**

1. Next.js (App Router puis Pages Router), crawl générique, WordPress (crawl + lecture de la config Yoast / Rank Math). WordPress pèse environ 59 % des CMS (W3Techs, août 2026).
2. Astro, Nuxt, SvelteKit, Remix / React Router, SPA Vite (audit de rendu), générateurs statiques (Hugo, Eleventy, Jekyll), puis Laravel, Django, Rails.
3. Crawl uniquement, sans accès au code : Shopify (7,6 %), Wix (6,1 %), Squarespace (3,5 %) (W3Techs, juillet 2026), Webflow, Tilda.

**Niveaux de support**

- **Complet (code + crawl) :** Next.js, Astro, Nuxt, SvelteKit, Remix / React Router, SPA Vite, générateurs statiques.
- **Partiel :** Laravel, Django, Rails (routes dans le code, templates côté serveur : extraction moins fiable, complétée par le crawl) ; WordPress (config des plugins SEO + crawl).
- **Crawl seul :** Shopify, Wix, Squarespace, Webflow, Tilda et tout site sans adapter.

Le langage du site analysé n'est jamais un obstacle (fichiers lus comme du texte, crawl en HTTP) : c'est la présence d'un adapter qui fixe le niveau de support.

Langages et formats à parser via tree-sitter : TS/TSX/JSX, Vue, Svelte, Astro, Markdown/MDX, JSON/YAML, PHP/Blade, templates Jinja/Django. Règle de discipline : aucun adapter n'est livré sans test sur un projet réel.

## 6. Exigences fonctionnelles détaillées

**Scanner**

- F-S1 Parcours en flux, `.gitignore` respecté, exclusions par défaut (`node_modules`, builds, `.env*`, clés, binaires), taille maximale par fichier configurable.
- F-S2 Hash de contenu + date de modification pour l'incrémental ; purge des fichiers disparus.
- F-S3 Extraction par adapter : routes, title, description, canonical, robots, Open Graph, hreflang, Hn, liens internes (graphe), JSON-LD, images (alt, dimensions), sitemap, robots.txt, redirections, config i18n.
- F-S4 Détection automatique du ou des frameworks (monorepos inclus).
- F-S5 Le code du projet scanné n'est jamais exécuté.

**Crawler**

- F-C1 robots.txt respecté, User-Agent identifiable, débit et concurrence configurables, profondeur maximale, liste de domaines autorisés, reprise après interruption.
- F-C2 Découverte via sitemap et liens.
- F-C3 Rendu navigateur optionnel (Playwright) ; les écarts entre code et rendu deviennent des constats.
- F-C4 Adresses privées bloquées par défaut (opt-in explicite pour les autres cas).

**Moteur de règles**

- F-R1 Une règle = identifiant, catégorie (technique, on-page, schema, local, GEO), sévérité, preuve, correctif suggéré, source officielle.
- F-R2 Catalogue initial d'environ 15 règles Must tirées de la check-list de validation du skill (title et meta uniques, H1 unique, canonical, pages privées hors sitemap, robots et sitemap accessibles, aucune redirection vers la connexion, JSON-LD valide), environ 40 en v0.2. Les longueurs de title et de meta sont des recommandations, pas des exigences de Google : sévérité faible.
- F-R3 Tout ce qui bloque l'indexation passe en tête quel que soit le score.
- F-R4 Score ICE = (Impact + Confiance + Effort) / 3, avec justification de chaque note.
- F-R5 Pas de règle sans source officielle ; sinon marquée « Rapporté, à vérifier ».

**Mémoire**

- F-M1 Dossier `.seo/` : `index.db` (cache reconstructible, non commité), `config`, `decisions.md`.
- F-M2 Livrables dans `docs/seo/AAAA-MM-JJ-<livrable>.md` (commités).
- F-M3 Commande `memory` pour consigner une décision ; l'agent lit l'historique avant de recommander.

**Veille et connecteurs**

- F-V1 `watch` interroge uniquement des sources officielles (flux, Search Central, Search Status Dashboard), compare, met à jour le fichier de veille et sa date ; alerte au-delà de 90 jours.
- F-D1 Connecteurs en lecture seule, OAuth avec PKCE, permissions minimales, quotas respectés, cache local.

**Rapports.** Structure commune du skill : résumé décisionnel (5 lignes max), constats avec preuves, actions priorisées (action, ICE, responsable, délai, KPI), impact attendu en fourchette, suivi.

**Commandes CLI :** `init`, `doctor`, `scan`, `crawl`, `audit`, `backlog`, `report`, `watch`, `memory`, `dashboard`, `mcp`, `uninstall`.

**Modes d'exécution**

L'outil fonctionne dans deux modes, avec les mêmes outils, le même index et le même skill. Le cœur déterministe (scan, crawl, règles, backlog ICE, rapports, dashboard) n'a besoin d'aucun modèle de langage : le modèle n'intervient que pour interpréter, rédiger (briefs, textes, correctifs) et répondre en langage naturel.

- **Mode agent hôte** (Claude Code, Codex, Gemini CLI, Cursor, Antigravity, OpenCode) : l'agent de l'IDE fournit le modèle, avec son propre abonnement ou sa propre clé. L'outil lui apporte le skill, le serveur MCP et la CLI, et ne demande aucune clé.
- **Mode autonome** (clé API Anthropic, OpenAI ou Gemini) : pour les utilisateurs sans agent d'IDE. La commande `seo-partner agent` et un panneau de discussion du dashboard font tourner une boucle d'agent interne qui appelle les mêmes outils que le serveur MCP.
- **Sans modèle :** toutes les commandes déterministes restent utilisables.

**Exigences du mode autonome**

- F-A1 Interface de fournisseur unique (discussion, appel d'outils, flux, estimation de coût) avec des adapters fins pour Anthropic, OpenAI et Gemini ; point d'extension pour un autre fournisseur ou un endpoint compatible OpenAI.
- F-A2 Définition unique des outils, exposée à la fois par le serveur MCP et par la boucle interne.
- F-A3 Recherche web : fournie par l'agent hôte en mode hôte ; en mode autonome, outil de recherche du fournisseur lorsqu'il existe, sinon API de recherche configurée par l'utilisateur, sinon lecture des seules sources officielles (`watch`).
- F-A4 Plafonds de jetons et d'étapes par session, coût estimé affiché, arrêt propre au plafond.
- F-A5 Aucune écriture dans le projet sans validation (propose-patch) ; contenu crawlé traité comme donnée non fiable.
- F-A6 Dégradation en trois paliers pour les hôtes sans MCP : outils MCP, puis CLI avec sortie `--json`, puis lecture directe des fichiers en dernier recours.
- F-A7 Commandes ajoutées : `agent`, `ask`, `config`.

## 7. Exigences non fonctionnelles

- **Performance :** voir section 4 ; dégradation contrôlée au-delà de 100 000 fichiers via `--scope` par dossier.
- **Fiabilité :** scans reprenables, migrations d'index sauvegardées, index entièrement reconstructible.
- **Portabilité :** Windows, macOS, Linux ; version minimale de Node à fixer sur la LTS active au démarrage du développement.
- **Accessibilité :** dashboard conforme WCAG 2.2 AA, navigation clavier, attributs ARIA.
- **Internationalisation :** interface et messages en anglais et français.
- **Observabilité :** logs structurés, commande `doctor`, aucune télémétrie par défaut (opt-in).
- **Maintenabilité :** TypeScript strict, frontières de modules nettes, ADR pour chaque choix structurant.

## 8. Architecture système

**Style :** monolithe modulaire, monorepo (pnpm workspaces), un seul processus local. Pas de microservices : aucun besoin de montée en charge distribuée pour un outil local.

```
packages/
  core/        types, config, jobs
  store/       SQLite, migrations
  adapters/    nextjs, wordpress, astro, ...
  crawler/     HTTP + rendu optionnel
  rules/       catalogue de règles, ICE
  connectors/  Search Console, PSI, Bing
  mcp/         serveur MCP
  tools/       outils partagés (MCP et agent)
  agent/       mode autonome (clé API)
  cli/         commandes
  server/      API locale (OpenAPI)
  dashboard/   interface web
skills/        skill pack indépendant des IDE
```

**Flux :** scan et crawl produisent des faits dans SQLite ; le moteur de règles produit des constats et des actions ; rapports, dashboard et MCP lisent la même base.

**Stack par défaut (révisable par ADR) :** TypeScript strict, Node LTS, SQLite en mode WAL avec recherche plein texte, tree-sitter, Hono + zod (API et OpenAPI), commander ou clack (CLI), undici + Playwright optionnel, Vitest et Playwright (tests), changesets (versions).

**Scalabilité sur 10 000+ fichiers :** parcours en flux, pool de worker threads, insertions par lots, limite mémoire bornée, fichiers volumineux ignorés, scan incrémental par hash.

**Résilience :** reprise des scans, délais d'attente et reprises avec temporisation sur le crawl, disjoncteur par domaine, journal d'erreurs exploitable par `doctor`.

## 9. Modèle de données (SQLite)

| Table | Colonnes clés |
| --- | --- |
| project | id, root, frameworks, created\_at |
| file | id, path, hash, mtime, size, kind, scanned\_at |
| route | id, file\_id, pattern, rendering\_mode |
| page\_meta | route\_id, title, description, canonical, robots, h1, og\_json, hreflang\_json |
| link | from\_route, to\_url, anchor, kind, rel |
| schema\_item | route\_id, type, json, valid |
| crawl\_run / crawl\_page | config, statut, url, code HTTP, chaîne de redirection, indexable, délai |
| rule | id, category, severity, source\_url |
| finding | id, rule\_id, subject\_ref, evidence\_json, status, first\_seen, last\_seen, resolved\_at |
| action | finding\_id, ice\_i, ice\_c, ice\_e, score, owner, due, kpi, status |
| metric\_snapshot | date, source, url, impressions, clicks, ctr, position |
| watch\_source / watch\_entry | url, type, last\_checked, hash, summary, confirmed |
| decision | date, text, rationale, finding\_id |

Migrations versionnées ; le schéma ERD est un livrable de v0.2.

## 10. Contrats d'API (design first)

**10.1 API locale du dashboard.** Spécification OpenAPI 3.1 rédigée avant l'implémentation, client TypeScript généré pour le front.

- Préfixe `/api/v1`, ressources au pluriel, pagination par curseur (`limit`, `cursor`), filtres (`severity`, `category`, `status`, `q`), tri (`sort=-score`).
- Erreurs au format `application/problem+json` (RFC 9457) avec code stable.
- Tâches longues : réponse 202, suivi par `/jobs/{id}` et événements SSE.
- `POST /scans` et `POST /crawls` acceptent `Idempotency-Key`.
- Changement cassant = `/v2` ; dépréciation annoncée dans le changelog.

| Endpoint | Rôle |
| --- | --- |
| GET /projects, /pages, /pages/{id} | Lecture de l'index |
| GET /findings, PATCH /findings/{id} | Constats et changement de statut |
| GET /backlog | Actions triées par ICE |
| POST /scans, POST /crawls | Lancer un job |
| GET /jobs/{id}, /jobs/{id}/events | État et progression |
| GET /metrics, /watch, /health | Mesures, veille, santé |

**10.2 Outils MCP.** Lecture seule par défaut : `list_pages`, `get_page`, `list_findings`, `get_backlog`, `search_index`, `get_history`. Actions avec confirmation : `run_scan`, `run_crawl`, `record_decision`. Le contenu issu du crawl est signalé comme non fiable dans les réponses.

**10.3 Contrat des adapters.** Interface TypeScript versionnée : `detect()`, `discoverRoutes()`, `extract()`, `capabilities`. Suite de tests de conformité commune.

**10.4 Contrat de constat.** JSON Schema versionné : `id`, `rule_id`, `severity`, `evidence` (source, chemin, ligne, URL), `ice`, `status`.

**10.5 Contrat des connecteurs externes.** Lecture seule, permissions minimales, quotas documentés, comportement défini en cas d'échec ou de quota dépassé.

## 11. Skill pack et intégration IDE

- **Généralisation du skill :** retirer les règles propres à un projet (déplacées dans la config du projet utilisateur), référencer les outils par capacité (« recherche web », « poser une question ») plutôt que par nom, respecter l'`AGENTS.md` du projet qui prime.
- **Mécanismes d'installation :** (1) copie du dossier skill, (2) génération de la config MCP, (3) repli sur une section dans `AGENTS.md` pour les IDE sans skills.
- **Cibles v0.1 :** Antigravity (`.agents/skills/` déjà utilisé), Claude Code, Codex, Gemini CLI, Cursor. Ensuite : OpenCode (traité comme un agent hôte, format à vérifier), Windsurf, VS Code Copilot. Chemins et formats à vérifier dans la documentation officielle de chaque outil au moment du développement, avec un test d'installation automatisé par cible.
- **`init` (inspiré de Spec Kit, sans ses pièges) :**
  - Cible le dossier courant par défaut et accepte `--here` par habitude d'usage (`seo-partner init --here --ide agy`).
  - **Détection d'agent sans blocage `PATH` :** sur Windows notamment, les IDE comme Antigravity ou Cursor n'exposent pas toujours de binaire en ligne de commande dans le `PATH`. `init` détecte les dossiers du projet (`.agents/`, `.cursor/`, `.claude/`) ou applique directement `--ide <cible>` sans échouer sur l'absence d'exécutable CLI (drapeau `--ignore-agent-tools` supporté et comportement tolérant par défaut).
  - **Fusion non destructive :** sur un répertoire non vide, ajoute uniquement `.seo/` et les fichiers d'intégration de l'agent sans jamais toucher ni écraser le code existant (confirmation explicite ou `--dry-run`).
  - **Sélection adaptée à l'OS :** détecte ou propose le type de script pertinent (`ps` PowerShell sur Windows, `sh` POSIX sur macOS/Linux) lorsque des scripts ou hooks sont générés.
  - **Sécurisation immédiate du `.gitignore` :** vérifie et ajoute automatiquement (ou sur confirmation) `.agents/`, `.seo/index.db` et `.seo/logs/` au `.gitignore` du projet hôte afin d'empêcher tout commit accidentel de jetons OAuth, clés API ou cache local.
  - Supporte `--terminal-only`, `--dry-run` et `uninstall` propre.

## 12. Dashboard (architecture frontend et design system)

- **Rendu :** SPA statique Vite + React + TypeScript + Tailwind, servie par le serveur local. Pas de SSR : un dashboard local n'a pas besoin d'être indexé (ADR-002).
- **État :** React Query pour l'état serveur, Zustand uniquement pour l'interface (filtres, thème), `useState` en local.
- **Pages :** Vue d'ensemble, Pages, Constats, Backlog ICE, Crawl, Veille, Historique, Réglages.
- **Design tokens :** couleurs, espacements, typographie, thèmes clair et sombre.
- **Composants :** Button, Input, Card, Table, Badge, Tabs, Modal, documentés dans Storybook ; package UI interne versionné en SemVer.
- **Performance :** tables virtualisées, découpage du code, chargement différé des graphiques.
- **Qualité :** accessibilité AA, tests Playwright des parcours principaux.

## 13. Sécurité et vie privée

Principe : local-first. L'outil n'envoie jamais de contenu du projet à un tiers de sa propre initiative. En mode agent hôte, le fournisseur du modèle est celui de l'IDE de l'utilisateur, hors du contrôle de l'outil. En mode autonome, seuls des extraits de l'index (chemins, métadonnées, constats) partent vers le fournisseur choisi, et l'envoi d'extraits de fichiers source exige une autorisation explicite. Les recherches web ne contiennent jamais d'extraits du code.

| Menace | Mesure |
| --- | --- |
| Fuite de code ou de secrets | Exclusion des `.env` et clés, masquage, requêtes web sans contenu de code, mode `--offline`, journal des sorties |
| SSRF via le crawler | Liste de domaines autorisés, adresses privées bloquées par défaut |
| Accès au dashboard depuis le réseau, CSRF, DNS rebinding | Écoute sur 127.0.0.1, contrôle Host et Origin, token de session, CORS fermé |
| Injection de prompt via pages crawlées ou fichiers | Contenu externe traité comme donnée, jamais comme instruction, marqué non fiable côté MCP |
| Attaque sur la chaîne d'approvisionnement npm | Peu de dépendances, lockfile, analyse des dépendances, publication avec provenance, 2FA |
| Vol des jetons Google et des clés API des modèles | Trousseau du système ou fichier en 0600, jamais dans `.seo/` commité, PKCE |
| Écriture non voulue par l'agent | Mode propose-patch par défaut, confirmation et `--dry-run` |
| Télémétrie | Aucune par défaut, opt-in explicite |

**Mode autonome (clé API)**

- Les clés Anthropic, OpenAI ou Gemini sont lues depuis les variables d'environnement ou le trousseau du système, jamais écrites dans `.seo/`, jamais journalisées.
- Plafond de jetons et d'étapes par session, coût estimé affiché ; `--offline` désactive tout appel au modèle et au web.
- Le journal des requêtes sortantes liste ce qui part vers le fournisseur et son volume ; l'envoi d'extraits de fichiers source exige une autorisation explicite par session.

**Pipeline CI/CD :** analyse statique (CodeQL), analyse des dépendances (Dependabot ou Renovate), détection de secrets, SBOM, protection des branches, jetons CI à moindre privilège, release signée avec provenance. `SECURITY.md` avec procédure de divulgation.

## 14. Tests, DevOps et distribution

- **Tests :** unitaires (Vitest), intégration sur projets types (Next.js, Astro, HTML statique), snapshots des constats, e2e du dashboard (Playwright), performance sur 10 000 fichiers générés, sécurité (SSRF, Host header), matrice d'installation par IDE et par système.
- **Distribution :** installation globale persistante recommandée (`pnpm add -g seo-partner` ou `npm install -g seo-partner`) exposant la commande `seo-partner` (et exécutable ponctuellement via `npx` / `pnpm dlx`) ; en complément, un binaire autonome (Node SEA, Bun compile ou équivalent, à valider), au plus tard avec les adapters Laravel et Django ; versions SemVer avec changesets, canal `next` pour les préversions.
- **12-factor :** configuration par fichier et variables d'environnement, logs sur la sortie standard, aucun état hors de `.seo/`.
- **Docker :** optionnel, pour la CI et l'exécution sans interface ; jamais requis pour l'utilisateur.

## 15. Documentation et onboarding

- **Documents :** README (EN, FR), démarrage en 5 minutes, guide par IDE, référence CLI, référence API (OpenAPI), une page par règle (pourquoi, comment corriger, source), guide d'adapter, CONTRIBUTING, SECURITY, CODE\_OF\_CONDUCT, CHANGELOG, dossier ADR, démonstrations animées.
- **Parcours utilisateur :** installation (`init`), premier scan, tutoriel sur 3 projets exemples, premier audit, intégration en CI.
- **Mesures :** temps jusqu'à la première valeur, taux d'installation réussie, effort perçu via un modèle d'issue de retour.

## 16. Feuille de route et déploiement progressif

| Version | Contenu | Critère de sortie |
| --- | --- | --- |
| v0.1 (2 à 3 semaines) | Skill généralisé, `init` sur 5 cibles, `doctor`, scan Next.js, rapport JSON/MD, 15 règles | US1 et US2, premier rapport sous 10 min sur 3 projets |
| v0.2 (2 à 3 semaines) | SQLite, incrémental, crawl, rapports HTML, PHP (Laravel, Symfony, Laragon), 40 règles | US3 et US5, cibles de performance tenues |
| v0.3 (2 semaines) | Dashboard lecture seule, OpenAPI | US7, accessibilité AA vérifiée |
| v0.4 (2 à 3 semaines) | MCP, Search Console, PageSpeed Insights, `watch` | US4, US9, US10 |
| v0.5 (2 semaines) | Astro, Nuxt, SvelteKit, SPA Vite, GitHub Action | Adapters validés sur projets réels |
| v0.6 (2 à 3 semaines) | Mode autonome : adapters Anthropic, OpenAI, Gemini, recherche web intégrée, plafonds de coût, panneau de discussion du dashboard | US11, journal des envois vérifié par test automatisé |
| v1.0 (3 à 4 semaines) | Durcissement, documentation complète, revue de sécurité, gel de l'API v1, binaire autonome | Tous les critères de la section 4 |

Estimations indicatives pour un mainteneur à plein temps (environ 4 à 5 mois au total), à recalibrer après v0.1.

**Déploiement :** préversions sur le tag npm `next`, drapeau `experimental` pour les adapters non validés. **Retour arrière :** versions épinglées, tag `latest` repointable, sauvegarde de `index.db` avant migration, reconstruction possible par `scan --rebuild`.

## 17. Risques

| Risque | Proba. | Impact | Réponse |
| --- | --- | --- | --- |
| Dispersion du périmètre | Haute | Livraison retardée | Phasage strict, Next.js d'abord |
| Concurrence de packs SEO existants | Moyenne | Faible adoption | Différenciateur : index local + crawl + dashboard, pas seulement des prompts |
| Formats des IDE qui évoluent | Haute | Installeur cassé | Tests d'installation par cible, adapters d'IDE isolés |
| Faux positifs | Moyenne | Perte de confiance | Preuve obligatoire par constat, corpus de test |
| Crawl abusif ou contraire aux conditions d'un site | Moyenne | Risque juridique et réputation | robots.txt, débit limité, User-Agent identifiable |
| Dépendance aux API Google (quotas, changements) | Moyenne | Fonction dégradée | Cache, mode sans connecteur |
| Charge de maintenance sur une seule personne | Haute | Projet abandonné | Périmètre réduit, contributions via guides d'adapter |
| Incident de sécurité sur un outil qui lit tout le code | Faible | Réputation | Section 13, revue avant v1.0 |

## 18. Gouvernance et valeur

- **Licence :** MIT, projet open source complet (décision validée).
- **Contribution :** guide d'adapter et de règle, revue des pull requests, ADR pour toute décision structurante.
- **Valeur pour Leadbooster :** vitrine technique et canal d'acquisition ; services autour (installation, audits, accompagnement) sans fonctionnalité verrouillée.

## 19. Décisions d'architecture et questions ouvertes

| ADR | Décision | Alternative écartée | Raison |
| --- | --- | --- | --- |
| 001 | TypeScript/Node de bout en bout | FastAPI + Next.js (défaut des prompts) | Installation globale simple (`pnpm add -g` / `npm i -g`) ou `npx`, un seul langage à maintenir (Node requis chez l'utilisateur, binaire autonome prévu pour les profils PHP, Python et Ruby), SDK MCP en TypeScript ; Python reste possible pour des scripts optionnels |
| 002 | SPA Vite servie localement | Next.js | Pas de SSR nécessaire, installation plus légère |
| 003 | SQLite | PostgreSQL, MongoDB | Local-first, zéro service, fichier unique |
| 004 | Monolithe modulaire | Microservices | Outil local mono-processus |
| 005 | Index déterministe interrogé par l'agent | Agent qui lit les fichiers | Coût, vitesse et fiabilité sur 10 000+ fichiers |
| 006 | MCP comme canal principal, skill comme couche de méthode | Prompts seuls | Portabilité entre IDE |
| 007 | Propose-patch par défaut | Écriture automatique | Sécurité et confiance |
| 008 | Définition unique des outils (MCP et agent interne), modèle de langage optionnel | Logique d'outils dupliquée par mode, ou outils dépendants d'un modèle | Même comportement dans les deux modes, cœur testable sans modèle |
| 009 | Mode autonome par adapters de fournisseurs fins, clé fournie par l'utilisateur | Framework d'orchestration lourd, service hébergé par le projet | Peu de dépendances, aucune clé ni donnée côté projet, coût à la charge de l'utilisateur |

**Décisions validées (28 octobre 2026) :** cible v1 = développeurs et freelances, non-techniques ensuite via le dashboard ; licence MIT, projet open source complet ; développement à plein temps.

**Questions ouvertes :** nom définitif (disponibilité npm et GitHub à vérifier), chemins et formats exacts par IDE (à vérifier dans la documentation officielle de chaque outil), statut d'OpenCode (agent hôte retenu par défaut). Choix techniques arrêtés : Playwright installé à la demande pour garder une installation légère, version minimale de Node alignée sur la LTS active au démarrage du développement.

## 20. Annexe : spécification du skill pack (M1)

Le texte intégral du skill vit dans le dépôt (`skills/seo-partner/SKILL.md` et `references/`), pas dans ce cahier des charges. Ce cahier fixe sa structure, ce qui reste, ce qui change et ce qui passe du prompt vers l'outil.

**À conserver :** rôle (stratégie SEO, SEO local, SEO technique), trois axes de raisonnement (intention, impact business, croissance durable), veille obligatoire avant toute recommandation, cadrage en 10 questions, 11 modes de travail, framework en 9 étapes (technique d'abord), score ICE et règles d'arbitrage, règles non négociables (aucune promesse de position, une requête principale par page, aucune tactique à risque, JSON-LD fidèle, preuve avant affirmation), 9 livrables avec structure commune, check-list de validation.

**Références à livrer et à généraliser :** `veille-mises-a-jour`, `audit-technique`, `implementation-nextjs`, `strategie-mots-cles`, `on-page-et-contenu`, `schema-donnees-structurees`, `seo-local`, `geo-geographique-et-generatif`, `netlinking-autorite`, `mesure-dashboard-roi`, `roadmap-12-mois`, plus `scripts/audit-metadata.mjs` (remplacé par `scan`).

| Élément actuel | Devient |
| --- | --- |
| `$ARGUMENTS` | Argument transmis par chaque cible ; absent, l'agent le demande |
| `search_web`, `ask_question` | Capacités abstraites « recherche web » et « poser une question », fournies par l'agent hôte ou par le mode autonome |
| Lecture et mise à jour manuelles du fichier de veille | `seo-partner watch`, date vérifiée par `doctor` |
| Cadrage : chercher d'abord dans le dépôt | Lecture de `.seo/config` et de l'index, questions seulement pour l'introuvable |
| Script `audit-metadata.mjs` (Next.js seulement) | `seo-partner scan` (tous les frameworks supportés) |
| Règles propres à un projet (langue, sans emoji, `pnpm build`) | `.seo/config` du projet utilisateur, jamais dans le skill |
| `PROJECT_MEMORY.md` | `.seo/decisions.md` ; l'`AGENTS.md` du projet utilisateur reste prioritaire |
| Dépendance au skill `copywriting` | Dépendance optionnelle déclarée ; absente, règles de rédaction minimales intégrées |
| Check-list de validation cochée à la main | Règles exécutées par `audit`, cases cochées automatiquement quand le critère est mesurable |
| Livrables écrits à la main dans `docs/seo/` | Générés par `report` |

**Forme :** version anglaise de référence et version française, mêmes sections. `SKILL.md` court (méthode et règles), détail dans les références chargées à la demande pour limiter le contexte consommé.

**Tests du skill :** scénarios d'évaluation sur chaque cible (l'agent appelle l'outil au lieu de relire les fichiers, refuse de promettre une position, marque tout fait non confirmé « Rapporté, à vérifier »).
