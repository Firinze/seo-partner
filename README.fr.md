<div align="center">

<img src="./assets/seo-partner-hero.svg" alt="SEO Partner — Banniere Emeraude Scintillante" width="100%" />

<br />

[![Version](https://img.shields.io/badge/version-0.4.0-10b981?style=for-the-badge&logoColor=white)](./package.json)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.5.0-059669?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7_Strict-047857?style=for-the-badge&logo=typescript&logoColor=white)](./tsconfig.base.json)
[![Packages](https://img.shields.io/badge/Workspaces-10_Packages-34d399?style=for-the-badge)](./package.json)
[![Outils MCP](https://img.shields.io/badge/Outils_MCP-7_Deterministes-10b981?style=for-the-badge)](./packages/mcp/src/server.ts)
[![SQLite WAL + FTS5](https://img.shields.io/badge/SQLite-WAL_%2B_FTS5-059669?style=for-the-badge&logo=sqlite&logoColor=white)](./packages/store/src/db.ts)
[![OpenAPI 3.1 + RFC 9457](https://img.shields.io/badge/OpenAPI_3.1-RFC_9457-047857?style=for-the-badge&logoColor=white)](./packages/server/src/openapi.ts)
[![Regles](https://img.shields.io/badge/Regles_SEO-40_Verifiees-10b981?style=for-the-badge&logoColor=white)](./packages/rules/src/engine.ts)
[![Licence](https://img.shields.io/badge/Licence-MIT-065f46?style=for-the-badge)](./LICENSE)

<p align="center">
  <strong>Registre d'outils SEO deterministes local-first, Serveur MCP standard sur flux stdio (7 outils), Moteur de remediation par diffs Git unifies (<code>seo-partner patch</code>), Crawler anti-SSRF, Moteur de 40 regles avec scoring ICE, API REST locale et Dashboard WCAG 2.2 AA.</strong><br />
  <em>Concu pour Antigravity (<code>agy</code>), Claude Code, Cursor, Windsurf, Codex, Gemini Code Assist et Cline — zero generation LLM non verifiee, zero execution de code cible (<code>F-S5</code>) et sauvegardes automatiques.</em>
</p>

<p align="center">
  <strong>Francais (Actif)</strong> &nbsp;|&nbsp; <a href="./README.md">Read in English (README.md)</a> &nbsp;|&nbsp; <a href="./SECURITY.md">Politique de Securite</a> &nbsp;|&nbsp; <a href="./CONTRIBUTING.md">Contribuer</a>
</p>

</div>

---

## Table des Matieres

1. [Vision et Proposition de Valeur (`v0.4`)](#1-vision-et-proposition-de-valeur-v04)
2. [Architecture Systeme et Flux de Donnees (`10 Packages`)](#2-architecture-systeme-et-flux-de-donnees-10-packages)
3. [Demarrage Rapide](#3-demarrage-rapide)
4. [Reference Complete de la CLI (12 Commandes)](#4-reference-complete-de-la-cli-12-commandes)
5. [Serveur Model Context Protocol (MCP) (`@seo-partner/mcp`)](#5-serveur-model-context-protocol-mcp-seo-partnermcp)
6. [Moteur de Remediation Deterministe (`seo-partner patch`)](#6-moteur-de-remediation-deterministe-seo-partner-patch)
7. [Serveur API Local (`127.0.0.1`, OpenAPI 3.1, RFC 9457) & Dashboard Web](#7-serveur-api-local-127001-openapi-31-rfc-9457--dashboard-web)
8. [Catalogue des 40 Regles SEO Verifiees et Methodologie ICE](#8-catalogue-des-40-regles-seo-verifiees-et-methodologie-ice)
9. [Support Multi-Frameworks : Next.js, Laravel, Symfony, PHP/Laragon et Statique](#9-support-multi-frameworks--nextjs-laravel-symfony-phplaragon-et-statique)
10. [Guide Developpeur et Architecture du Workspace](#10-guide-developpeur-et-architecture-du-workspace)
11. [Securite, Garde-Fou Git, Sauvegardes et Anti-SSRF](#11-securite-garde-fou-git-sauvegardes-et-anti-ssrf)
12. [Guide de Depannage et FAQ](#12-guide-de-depannage-et-faq)
13. [Feuille de Route (`v0.1` a `v1.0`) et Gouvernance Documentaire](#13-feuille-de-route-v01-a-v10-et-gouvernance-documentaire)

---

## 1. Vision et Proposition de Valeur (`v0.4`)

`seo-partner` separe strictement **ce qui doit etre exact a 100 %** (analyse statique en TypeScript, serveur MCP stdio standard, crawl HTTP anti-SSRF, base SQLite WAL + `FTS5`, correctifs deterministes par diffs unifies et API OpenAPI locale) de **ce qui releve du conseil editorial et strategique** (agents IA dans leurs IDE hotes) :

| Capacite | Agent IA Generique | Crawler Cloud SaaS | **`seo-partner` (`v0.4`)** |
| :--- | :--- | :--- | :--- |
| **Model Context Protocol (MCP)** | Prompts manuels copies-colles | API proprietaires | **Oui — Serveur stdio JSON-RPC 2.0 Standard (7 outils partages)** |
| **Remediation & Patchs securises** | Hallucinations de code | Audit en lecture seule | **Oui — Diffs unifies verifiables + `--apply` atomique + Sauvegardes** |
| **Decouverte des routes (Next.js, Laravel, Symfony, PHP/Laragon)** | Limites de fenetre contextuelle | URLs publiees seulement | **Oui — 100 % deterministe (Parseurs statiques d'AST & Templates)** |
| **Scan incremental en boucle courte IDE (`< 5 s`)** | Relecture integrale | N/A | **Oui — Diff `(mtimeMs, sizeBytes, sha256)` + `FTS5` `< 100 ms`** |
| **Crawler HTTP securise & Comparateur Code vs. Crawl** | Non | Sans lien avec le code | **Oui — `seo-partner crawl` + Comparateur cote a cote** |
| **Dashboard Web local & API OpenAPI 3.1 (`127.0.0.1`)** | Non | Cloud payant externe | **Oui — `seo-partner serve` (Auto-fallback de port, RFC 9457, WCAG 2.2 AA)** |
| **Execution du code du projet analyse (`F-S5`)** | Appels shell risques | N/A | **Zero execution (`php`/`eval`/`build` strictement interdits)** |
| **Catalogue de regles & Priorisation ICE (`F-R3`)** | Subjective | Generique | **40 regles verifiees (`ICE = (I+C+E)/3` + Blocages en tete)** |
| **Livrables executifs (Markdown, JSON, HTML5 autonome)** | Chat ephemere | Export proprietaire | **Rapports 5 parties `.md`, `.json` et `.html` 100 % hors ligne** |

---

## 2. Architecture Systeme et Flux de Donnees (`10 Packages`)

### 2.1 Architecture Modulaire du Monorepo (`10 Packages` — `pnpm workspaces`)

```mermaid
flowchart TB
  subgraph IDE["Environnement Hote (Antigravity, Claude Code, Cursor, Windsurf, Codex, Gemini Code Assist, Cline)"]
    DEV["Developpeur / Agent IA"]
    MCP_CLIENT["Client MCP (stdio JSON-RPC 2.0)"]
    SKILL["Skill Pack Bilingue (EN / FR)\nSKILL.md + 11 Guides de Reference"]
  end

  subgraph CLI_LAYER["Couche CLI & Integration"]
    CLI["@seo-partner/cli\nBinaire seo-partner (12 Commandes)\nmcp | patch | init --with-mcp | serve | crawl | scan | audit"]
    MCP_PKG["@seo-partner/mcp\nServeur stdio JSON-RPC 2.0\nHandshake | tools/list | tools/call"]
  end

  subgraph TOOLS_LAYER["Couche Outils Deterministes & Remediation"]
    TOOLS["@seo-partner/tools\nRegistre partage (7 outils) | Moteurs Scan & Audit\nMoteur de Patch | Diff unifie LCS | 7 Correcteurs | Securite & Backups"]
  end

  subgraph WEB_LAYER["Couche Web & API Locale"]
    SERVER["@seo-partner/server\n127.0.0.1 Loopback | OpenAPI 3.1 (/api/v1 - 18 Ops)\nErreurs RFC 9457 | Cookie HttpOnly | /api/v1/patches"]
    DASHBOARD["@seo-partner/dashboard\ncomponents/ui & components/features\nOnglet Correctifs | Comparateur | FTS5 | WCAG 2.2 AA"]
  end

  subgraph ENGINE_LAYER["Couche Metier Deterministe"]
    ADAPTERS["@seo-partner/adapters\nNextJsAdapter (App & Pages Router)\nPhpAdapter (Laravel, Symfony, Laragon)\nStaticAdapter"]
    CRAWLER["@seo-partner/crawler\nGarde Anti-SSRF (DNS par saut)\nRespect robots.txt & Rate-Limiter | Playwright (--js)"]
    RULES["@seo-partner/rules\n40 Regles verifiees | Scoreur ICE | Rapports MD / HTML5 / JSON"]
  end

  subgraph FOUNDATION_LAYER["Socle Local-First"]
    CORE["@seo-partner/core\nTypes partages | Garde .gitignore | Config Zod | Journal Outbound"]
    STORE["@seo-partner/store\nSQLite Natif v2 (WAL + FTS5)\n.seo/index.db | CrawlRun / CrawlPage"]
  end

  DEV --> CLI
  MCP_CLIENT <-->|stdio JSON-RPC 2.0| MCP_PKG
  MCP_PKG --> TOOLS
  CLI --> TOOLS
  SERVER --> TOOLS
  SERVER --> DASHBOARD
  TOOLS --> ADAPTERS
  TOOLS --> CRAWLER
  TOOLS --> RULES
  TOOLS --> STORE
  TOOLS --> CORE
```

---

## 3. Demarrage Rapide

```powershell
# 0. Cloner le depot et construire les 10 packages du workspace
git clone https://github.com/Firinze/seo-partner.git
cd seo-partner
pnpm install
pnpm run build

# 1. Initialiser seo-partner avec fusion des configurations MCP multi-IDE
seo-partner init --here --ide all --with-mcp --lang fr

# 2. Verifier l'integrite de l'installation (6 verifications en < 5 s)
seo-partner doctor

# 3. Demarrer le serveur MCP stdio (ou laisser Claude / Cursor l'invoquer)
seo-partner mcp

# 4. Scanner les fichiers sources de facon incrementale (< 5 s + index FTS5)
seo-partner scan

# 5. Executer l'audit des 40 regles
seo-partner audit

# 6. Generer les propositions de correctifs deterministes (dry-run par defaut)
seo-partner patch

# 7. Appliquer en toute securite avec sauvegarde automatique et garde Git
seo-partner patch --apply

# 8. Lancer le Dashboard Web local sur http://127.0.0.1:4321
seo-partner serve --port 4321 --lang fr
```

---

## 4. Reference Complete de la CLI (12 Commandes)

1. **`seo-partner init`**: Cree `.seo/config.json`, `.seo/decisions.md`, securise `.gitignore`, installe les skills et, avec `--with-mcp`, fusionne automatiquement la configuration stdio MCP pour Claude Code (`claude_desktop_config.json` / `.claude/mcp.json`), Cursor (`.cursor/mcp.json`), Windsurf (`.codeium/windsurf/mcp_config.json`), Codex (`.codex/config.toml`), Gemini Code Assist (`.gemini/mcp.json`) et Cline.
2. **`seo-partner mcp`**: Demarre le serveur Model Context Protocol sur flux stdio (JSON-RPC 2.0), exposant les 7 outils deterministes. Accepte le drapeau `--allow-apply` pour autoriser l'application directe des correctifs.
3. **`seo-partner patch`**: Genere des diffs Git unifies verifiables (`.seo/patches/<batchId>.diff`) pour les regles corrigibles (`R-TECH-01`, `R-TECH-02`, `R-TECH-03`, `R-TECH-05`, `R-TECH-14`, `R-ONPAGE-01`, `R-ONPAGE-04`). Avec `--apply`, verifie l'etat Git, cree une sauvegarde dans `.seo/backups/<timestamp>/`, applique les diffs et decompte les marqueurs `TODO-SEO`.
4. **`seo-partner doctor`**: Execute 6 controles de sante en moins de 5 secondes (`node-version`, `seo-config`, `gitignore-security`, `ide-skill-integrity`, `watch-freshness`, `sqlite-wal`).
5. **`seo-partner scan`**: Scanner incremental (`< 5 s`), reemployant les fichiers inchanges grace au triplet `(mtimeMs, sizeBytes, sha256)`, purgeant les routes supprimees et actualisant l'index SQLite FTS5.
6. **`seo-partner crawl <url>`**: Crawler HTTP anti-SSRF respectant robots.txt, la validation DNS par saut et la limitation de debit (`--allow-local` pour Laragon / `127.0.0.1`).
7. **`seo-partner audit`**: Evalue 40 regles SEO deterministes sur les donnees du scan statique et du crawl.
8. **`seo-partner backlog`**: Affiche les actions prioritaires avec les blocages d'indexation (`F-R3`) systematiquement en tete, suivis du score ICE decroissant.
9. **`seo-partner report`**: Genere des rapports executifs 5 parties en Markdown, JSON ou HTML5 autonome hors ligne.
10. **`seo-partner serve`**: Lance le serveur API local et le Dashboard Web interactif sur `127.0.0.1` avec fallback automatique de port (`+1..20`).
11. **`seo-partner memory`**: Synchronise les decisions architecturales SEO entre `.seo/decisions.md` et SQLite.
12. **`seo-partner uninstall`**: Supprime proprement les fichiers de skills IDE tout en preservant les donnees `.seo/`.

---

## 5. Serveur Model Context Protocol (MCP) (`@seo-partner/mcp`)

Le serveur MCP met en oeuvre le protocole Model Context Protocol officiel sur flux `stdio` avec JSON-RPC 2.0 sans dependance SDK externe lourde :

### Outils Exposes (7 Outils Deterministes)

| Nom de l'Outil | Parametres | Description |
| :--- | :--- | :--- |
| `list_routes` | `limit?: number, offset?: number` | Liste toutes les routes decouvertes avec framework, title, canonical et robots. |
| `get_route` | `routePattern: string` | Restitue les metadonnees detaillees, la hierarchie H1-H6 et les liens pour une route donnee. |
| `search_routes` | `query: string, limit?: number` | Recherche plein texte SQLite FTS5 sur les titres, descriptions et titres H1-H6 (`< 100 ms`). |
| `get_findings` | `category?, severity?, blocksIndexing?: boolean` | Liste les constats d'audit avec preuve exacte (`filePath:lineNumber`) et conseil de remediation. |
| `get_backlog` | `ownerRole?, targetTimeframe?` | Retourne les actions priorisees ICE (`ICE = (I+C+E)/3`) avec blocages d'indexation en tete. |
| `run_audit` | `crawlRunId?: string` | Declenche une evaluation fraiche de l'audit et enregistre les constats dans SQLite. |
| `propose_patch` | `findingId?, ruleId?, apply?: boolean, force?: boolean` | Genere des diffs unifies pour les regles corrigibles ; n'applique que si `--allow-apply` est actif. |

---

## 6. Moteur de Remediation Deterministe (`seo-partner patch`)

Le moteur de remediation repare les defauts SEO corrigibles par transformation directe d'AST ou de chaines, sans hallucination de code :

1. **Regles Corrigibles (`7 Regles`)**:
   - `R-TECH-01`: Cree un fichier `public/robots.txt` manquant avec politique d'acces par defaut et directive `Sitemap`.
   - `R-TECH-02`: Cree un fichier `public/sitemap.xml` manquant a partir des routes canoniques decouvertes.
   - `R-TECH-03`: Remplace les directives `noindex` involontaires par `index, follow`.
   - `R-TECH-05`: Injecte la balise auto-referente `<link rel="canonical" href="...">`.
   - `R-TECH-14`: Ajoute l'attribut `<html lang="fr">` manquant sur les elements HTML racine.
   - `R-ONPAGE-01`: Injecte la balise `<title>` manquante avec le marqueur editorial deterministe `TODO-SEO`.
   - `R-ONPAGE-04`: Injecte le titre `<h1>` manquant avec le marqueur editorial deterministe `TODO-SEO`.

2. **Generation de Diff Unifie (Algorithme LCS)**:
   - Construit une matrice LCS (Plus Longue Sous-Sequence Commune) avec un plafond de securite a 5000 lignes.
   - Produit des sections de diff unifie standard (`@@ -oldStart,oldLines +newStart,newLines @@`) compatibles avec `git apply --check`.

3. **Pipeline d'Application Securise**:
   - **Protection contre les Chemins Malveillants**: Rejette `..`, les chemins absolus, `.git/` et les secrets `.env*`.
   - **Garde-Fou d'Espace de Travail Git Modifie**: Refuse d'ecrire si les fichiers cibles comportent des modifications non commitees (contournable avec `--force`).
   - **Sauvegardes Horodatees Automatiques**: Sauvegarde chaque fichier modifie dans `.seo/backups/<timestamp>/` avant toute modification.
   - **Ecriture Atomique avec Restauration**: Ecrit dans un fichier temporaire frere avant renommage atomique ; restaure la sauvegarde en cas d'erreur.

---

## 7. Serveur API Local (`127.0.0.1`, OpenAPI 3.1, RFC 9457) & Dashboard Web

- **Isolation Boucle Locale (`127.0.0.1`)**: N'ecoute jamais sur le reseau externe ni sur `0.0.0.0`.
- **Intercepteurs de Securite**: Controle strict des en-tetes `Host` et `Origin` ; cookie HttpOnly `seo_partner_session` obligatoire sur tous les POST mutants.
- **Points de Terminaison REST pour les Correctifs**:
  - `GET /api/v1/patches`: Liste tous les lots de correctifs sur disque, ou restitue un lot precis via `?batchId=...`.
  - `POST /api/v1/patches`: Genere des propositions de correctifs en memoire et ecrit `.seo/patches/<batchId>.diff`. Rejette toute demande d'application directe via REST (`apply: true`) avec `422 Unprocessable Entity` pour des raisons de securite.
- **Dashboard Modulaire (`@seo-partner/dashboard`)**:
  - 7 onglets interactifs : Synthese, Routes, Constats, Backlog, Comparateur, Decisions et **Correctifs**.
  - Inspection visuelle des diffs unifies avec surlignage vert/rouge subtil.
  - Regles d'interface strictes : conformite WCAG 2.2 AA, zero emoji, zero glassmorphism (`backdrop-filter` interdit) et zero bordure laterale d'accentuation.

---

## 8. Catalogue des 40 Regles SEO Verifiees et Methodologie ICE

$$\text{ICE} = \text{round}\left(\frac{\text{Impact} + \text{Confidence} + \text{Effort}}{3}, 2\right)$$

> [!IMPORTANT]
> **Regle de Priorite Absolue (`F-R3`)**: Tout constat comportant `blocksIndexing = true` (`R-TECH-01`, `R-TECH-02`, `R-TECH-03`, `R-TECH-06`, `R-TECH-07`, `R-TECH-09`) est **toujours place en tete de liste**, devant tous les constats non bloquants, quel que soit leur score ICE nominal.

- **Technique (`R-TECH-01` a `R-TECH-14`, 14 regles)**: `robots.txt`, `sitemap.xml`, `noindex`, routes privees dans sitemap, canonique manquante, routes client-only, erreurs HTTP `4xx`/`5xx`, chaines de redirections, `X-Robots-Tag`, contradictions code vs crawl, liens casses, pages orphelines, profondeur de clic `> 3` et attribut `<html lang>` manquant.
- **On-Page (`R-ONPAGE-01` a `R-ONPAGE-14`, 14 regles)**: Balises `<title>` manquantes ou sous-optimales, meta `description`, structure `<h1>`, textes `alt` d'images, hierarchie des titres, doublons de `<h1>`, dimensions d'images (`CLS`), textes d'ancres generiques, balises Open Graph et divergences code vs crawl.
- **Schema.org (`R-SCHEMA-01` a `R-SCHEMA-05`, 5 regles)**: Validite syntaxique JSON-LD, `Organization`/`WebSite`, `Article`/`BlogPosting`, `Product` et `FAQPage`/`BreadcrumbList`.
- **SEO Local (`R-LOCAL-01` a `R-LOCAL-04`, 4 regles)**: Adresse `LocalBusiness`, `telephone` (NAP), formatage E.164 international et horaires d'ouverture / coordonnees geo.
- **GEO — International & Generatif (`R-GEO-01` a `R-GEO-03`, 3 regles)**: Validite ISO des `hreflang`, exhaustivite du cluster et politique explicite des robots d'exploration IA dans `robots.txt`.

---

## 9. Support Multi-Frameworks : Next.js, Laravel, Symfony, PHP/Laragon et Statique

En conformite absolue avec le Principe Constitutionnel II (`F-S5`), **aucun interpreteur externe (`php`, `node`, `eval`) n'est jamais execute sur les fichiers du projet analyse** :

- **`NextJsAdapter`**: App Router (`app/**/page.tsx`) et Pages Router (`pages/**/*.tsx`), `metadata` statique et `generateMetadata`.
- **`PhpAdapter` (`laravel`)**: Analyse `routes/web.php` et les gabarits Blade avec `@extends`, `@section` et `@yield`.
- **`PhpAdapter` (`symfony`)**: Analyse les attributs PHP 8 `#[Route]`, `config/routes.yaml` et les gabarits Twig avec `{% extends %}` et `{% block %}`.
- **`PhpAdapter` (`php`)**: Analyse les projets PHP natifs / Laragon (`public/*.php`), resolvant les inclusions d'en-tetes.
- **`StaticAdapter`**: Fichiers HTML5 statiques (`*.html`) et Markdown (`*.md`, `*.mdx`).

---

## 10. Guide Developpeur et Architecture du Workspace

```powershell
pnpm run build                        # Compiler les 10 packages du workspace
pnpm exec tsc --noEmit                # Verification TypeScript stricte integrale
pnpm exec vitest run tests/unit       # Suite de tests unitaires
pnpm run test:coverage                # Suite complete de couverture (>= 80%)
```

### Packages du Workspace (`10 Packages`)

- `@seo-partner/core`: Interfaces partagees, configuration, garde gitignore et journal d'audit.
- `@seo-partner/store`: Base de donnees SQLite native avec WAL et recherche plein texte FTS5.
- `@seo-partner/adapters`: Parseurs statiques d'AST et de gabarits pour Next.js, PHP et Statique.
- `@seo-partner/crawler`: Crawler HTTP anti-SSRF avec validation DNS par saut et parseur robots.txt.
- `@seo-partner/rules`: Moteur de 40 regles SEO verifiees et priorisation ICE.
- `@seo-partner/tools`: Registre d'outils partages, moteurs de scan/audit incrementaux, diff unifie LCS et correcteurs deterministes.
- `@seo-partner/mcp`: Serveur stdio JSON-RPC 2.0 exposant les 7 outils deterministes.
- `@seo-partner/server`: API REST locale sur `127.0.0.1` (OpenAPI 3.1, RFC 9457).
- `@seo-partner/dashboard`: Dashboard Web local SPA conforme WCAG 2.2 AA.
- `@seo-partner/cli`: Executable complet en ligne de commande (`seo-partner`).

---

## 11. Securite, Garde-Fou Git, Sauvegardes et Anti-SSRF

- **Zero Execution de Code Cible (`F-S5`)**: Analyse statique d'AST et de gabarits uniquement ; aucun interpreteur externe invoque sur les fichiers scannes.
- **Correcteurs Deterministes Exclusifs**: Aucune generation de code LLM non controlee ; les textes editoriaux utilisent des marqueurs `TODO-SEO`.
- **Verification de Travail Git Non Commite**: Refus d'ecraser des fichiers si des modifications non validees sont detectees.
- **Sauvegardes Prealables Horodatees**: Sauvegarde dans `.seo/backups/<timestamp>/` avant application des modifications.
- **Anti-SSRF Strict par Saut DNS**: Blocage des adresses IP privees, locales et de metadonnees cloud (`169.254.169.254` bloque inconditionnellement).
- **Protection Obligatoire `.gitignore`**: Verification et injection systematiques de `.seo/index.db*`, `.seo/patches/`, `.seo/backups/` et `.seo/audit.log`.

---

## 12. Guide de Depannage et FAQ

- **Comment connecter Claude Code ou Cursor a seo-partner via MCP ?**:
  Executez `seo-partner init --with-mcp`. La commande fusionne l'entree du serveur stdio `seo-partner` dans la configuration de votre IDE sans ecraser les serveurs existants.
- **Pourquoi l'application de correctifs est-elle refusee via l'API REST ?**:
  L'ecriture directe sur disque via une requete HTTP est strictement interdite pour des raisons de securite. Les correctifs doivent etre appliques en ligne de commande (`seo-partner patch --apply`) ou via MCP avec le drapeau explicite `--allow-apply`.
- **Que faire si un fichier comporte des modifications Git non validees ?**:
  `seo-partner patch --apply` rejette l'operation avec le code `git-dirty`. Commitez ou remisez vos modifications au prealable, ou utilisez `--force` si vous souhaitez deliberement poursuivre.

---

## 13. Feuille de Route (`v0.1` a `v1.0`) et Gouvernance Documentaire

- **`v0.1` (Livree)**: Skill Pack bilingue (`11/11` EN/FR), 8 commandes CLI, 5 installateurs IDE, Scanner Next.js et Statique, SQLite WAL, 15 regles indispensables, calcul ICE et rapports 5 parties.
- **`v0.2` (Livree)**: Scan incremental (`< 5 s`) + recherche SQLite FTS5, Crawler HTTP anti-SSRF, PhpAdapter (Laravel, Symfony, Laragon), 40 regles SEO verifiees et rapports HTML5 autonomes.
- **`v0.3` (Livree)**: Serveur API local sur `127.0.0.1` (auto-fallback de port, OpenAPI 3.1, RFC 9457, cookie HttpOnly) et Dashboard Web modulaire WCAG 2.2 AA.
- **`v0.4` (Livree)**: Serveur MCP stdio standard (`@seo-partner/mcp`, 7 outils), Moteur de remediation deterministe (`seo-partner patch`, diffs unifies LCS, `--apply` securise, sauvegardes, garde-fou Git), Fusion de configuration MCP multi-IDE et Onglet Correctifs du Dashboard.
- **`v0.5` (Planifiee)**: Adapters Astro, Nuxt, Remix, SvelteKit et Django.
- **`v0.6`–`v1.0` (Planifiees)**: Boucle d'agent autonome, connecteurs optionnels GSC/CWV et binaires systeme autonomes.

---

## Licence

Distribue sous licence **MIT**. Consulter le fichier [LICENSE](./LICENSE) pour plus de details.

<div align="center">
  <sub>Concu par <strong><a href="https://github.com/Firinze/seo-partner">Firinze Gbenito Dossou</a></strong></sub>
</div>
