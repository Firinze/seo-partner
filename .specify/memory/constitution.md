<!--
Sync Impact Report
- Version change: 0.0.0 (template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Cœur Déterministe & Preuve Obligatoire (NON-NÉGOCIABLE)
  - [PRINCIPLE_2_NAME] → II. Local-First, Sécurité & Zéro Exécution (NON-NÉGOCIABLE)
  - [PRINCIPLE_3_NAME] → III. Installation & Intégration IDE Sans Piège
  - [PRINCIPLE_4_NAME] → IV. Monolithe Modulaire TypeScript & Parité des Modes
  - [PRINCIPLE_5_NAME] → V. Priorisation ICE & Discipline de Test sur Projets Réels
- Added sections:
  - Architecture, Sécurité & Standards de Performance
  - Workflow de Développement & Qualité
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (aligned with Constitution Check gates)
  - ✅ .specify/templates/spec-template.md (aligned with testable requirements & success criteria)
  - ✅ .specify/templates/tasks-template.md (aligned with modular monorepo & test discipline)
- Follow-up TODOs: None
-->
# seo-partner Constitution

## Core Principles

### I. Cœur Déterministe & Preuve Obligatoire (NON-NÉGOCIABLE)

Le scan du code, le crawl HTTP, l'évaluation des règles, le calcul du score ICE et la génération de rapports DOIVENT fonctionner de manière 100 % déterministe, sans requérir de modèle de langage (LLM). Le modèle n'intervient que pour interpréter, rédiger des briefs/correctifs ou dialoguer en langage naturel. Chaque constat (`finding`) DOIT citer sa preuve exacte (chemin du fichier et ligne, ou URL testée et statut HTTP). Toute règle ou recommandation DOIT s'appuyer sur une source officielle vérifiée (moins de 90 jours via `watch`) ; toute information non confirmée DOIT être explicitement marquée « Rapporté, à vérifier ». L'outil et le skill NE DOIVENT JAMAIS promettre de position ni de délai garanti.

### II. Local-First, Sécurité & Zéro Exécution (NON-NÉGOCIABLE)

L'outil DOIT fonctionner en mode local-first et persister son état dans `.seo/` (`index.db` reconstructible, `config.json`, `decisions.md`) ainsi que ses livrables dans `docs/seo/AAAA-MM-JJ-<livrable>.md`. Le code du projet analysé NE DOIT JAMAIS être exécuté (`F-S5`) : l'extraction repose exclusivement sur la lecture en flux et l'analyse syntaxique (`tree-sitter`). Les fichiers sensibles (`.env*`, clés privées, binaires, `.gitignore`) DOIVENT être exclus par défaut. Aucune donnée ni aucun extrait de code NE DOIT être envoyé à un tiers sans autorisation explicite (mode `--offline`, journal des requêtes sortantes consultable, mode `propose-patch` par défaut avant toute modification du dépôt).

### III. Installation & Intégration IDE Sans Piège

L'outil DOIT privilégier une installation globale persistante (`pnpm add -g seo-partner` ou `npm install -g seo-partner`, complétée par `npx` en usage ponctuel et un binaire autonome) exposant la commande `seo-partner`. La commande `seo-partner init` DOIT cibler le dossier courant par défaut (et accepter `--here`), détecter les dossiers d'intégration de l'IDE (`.agents/`, `.cursor/`, `.claude/`) sans jamais échouer si le binaire CLI de l'agent est absent du `PATH` système (`--ignore-agent-tools` toléré nativement), fusionner sans jamais écraser les fichiers existants du projet hôte, adapter les scripts générés au shell de l'OS (`ps` PowerShell sur Windows, `sh` POSIX sur macOS/Linux), et sécuriser automatiquement le `.gitignore` (`.agents/`, `.seo/index.db`, `.seo/logs/`).

### IV. Monolithe Modulaire TypeScript & Parité des Modes

L'ensemble du projet DOIT être développé en TypeScript strict au sein d'un monorepo `pnpm workspaces` mono-processus (`core`, `store`, `adapters`, `crawler`, `rules`, `connectors`, `mcp`, `tools`, `agent`, `cli`, `server`, `dashboard`, `skills`). Les outils exposés aux agents DOIVENT avoir une définition unique (`packages/tools`) partagée entre le serveur MCP (mode agent hôte), la boucle d'agent interne (mode autonome avec clé API Anthropic, OpenAI ou Gemini) et la CLI (`--json`), garantissant une parité fonctionnelle stricte sur tous les IDE supportés (Antigravity, Claude Code, Codex, Gemini CLI, Cursor, OpenCode).

### V. Priorisation ICE & Discipline de Test sur Projets Réels

Chaque action du backlog DOIT être priorisée par son score `ICE = (Impact + Confiance + Effort) / 3` avec justification des trois notes. Par règle d'arbitrage absolue (`F-R3`), tout problème bloquant l'indexation (`noindex` accidentel, blocage `robots.txt`, erreur 5xx, redirection vers une page de connexion) DOIT passer en tête du backlog quel que soit son score ICE. La couverture de tests automatisés du cœur (`Vitest`) DOIT être maintenue à au moins 80 %, le taux de faux positifs des règles `Must` DOIT rester sous 10 %, et aucun adapter de framework NE DOIT être livré sans test de conformité validé sur un projet réel.

## Architecture, Sécurité & Standards de Performance

- **Stack technique de référence** : Node.js LTS, TypeScript strict, SQLite en mode WAL avec recherche plein texte (FTS5), `tree-sitter` pour le parsing multi-langages, Hono + Zod pour l'API locale conforme OpenAPI 3.1 (préfixe `/api/v1`, erreurs au format RFC 9457 `application/problem+json`), et SPA Vite + React + TailwindCSS pour le dashboard local (WCAG 2.2 AA, Mobile-First, séparation `components/ui/` et `components/features/`).
- **Cibles de performance** : Installation jusqu'au premier rapport exploitable (`doctor` vert) < 10 minutes ; scan à froid de 10 000 fichiers < 60 secondes ; scan incrémental (5 fichiers modifiés) < 5 secondes ; mémoire vive maximale pendant un scan < 1 Go.
- **Cloisonnement réseau & anti-SSRF** : Le serveur local DOIT écouter exclusivement sur `127.0.0.1` avec vérification `Host`/`Origin` et jeton de session. Le crawler DOIT respecter `robots.txt`, bloquer par défaut les adresses IP privées ou locales (protection SSRF, débrayable uniquement par opt-in explicite pour le développement local) et baliser tout contenu crawlé comme donnée externe non fiable afin de prévenir toute injection de prompt.

## Workflow de Développement & Qualité

- **Phasage incrémental strict** : Le développement DOIT suivre l'ordre de la feuille de route (`v0.1` à `v1.0`) sans dispersion du périmètre : socle `v0.1` (Skill pack généralisé M1, CLI `init`/`doctor`/`scan`/`uninstall` M2, Scanner Next.js M3, 15 règles `Must` + ICE M4) avant d'entamer le crawl (`v0.2`), le dashboard (`v0.3`), le serveur MCP (`v0.4`), les adapters additionnels (`v0.5`) et le mode autonome (`v0.6`).
- **Qualité de code & Internationalisation** : Le code DOIT respecter le principe DRY et être livré complet, sans `TODO` ni placeholder. L'interface, la CLI, la documentation et le skill pack DOIVENT supporter l'anglais (référence) et le français.
- **Traçabilité architecturale (ADR)** : Tout écart vis-à-vis de la stack de référence ou tout changement cassant des contrats (`OpenAPI`, schéma `SQLite`, interface `Adapter`, outils `MCP`) DOIT être documenté dans un ADR et accompagné d'une migration versionnée avec sauvegarde automatique de `.seo/index.db`.

## Governance

Cette Constitution prévaut sur toute autre pratique de développement du dépôt `seo-partner`. Tout plan d'implémentation (`plan.md`), spécification (`spec.md`), liste de tâches (`tasks.md`) et revue de code DOIT vérifier explicitement la conformité aux cinq principes fondamentaux ci-dessus.

Toute modification de cette Constitution exige :
1. La documentation de la justification technique ou produit (référencée par un ADR si structurante).
2. La mise à jour du numéro de version selon SemVer (`MAJOR` pour une suppression ou redéfinition incompatible d'un principe, `MINOR` pour l'ajout d'un principe ou d'une contrainte substantielle, `PATCH` pour une clarification rédactionnelle).
3. La vérification de cohérence avec le cahier des charges et les templates `.specify/`.

**Version**: 1.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
