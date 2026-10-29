import fs from 'node:fs';
import path from 'node:path';

export interface EliteDeliverablesOptions {
  projectRoot: string;
  projectName: string;
  domain: string;
  framework?: string;
}

export async function generate9EliteDeliverables(
  options: EliteDeliverablesOptions,
): Promise<string[]> {
  const { projectRoot, projectName, domain, framework = 'next_app' } = options;
  const docsSeoDir = path.join(projectRoot, 'docs', 'seo');

  if (!fs.existsSync(docsSeoDir)) {
    fs.mkdirSync(docsSeoDir, { recursive: true });
  }

  const generatedFiles: string[] = [];

  const deliverables: Record<string, string> = {
    '01-audit-technique.md': `# Audit Technique SEO - ${projectName}

## 1. Périmètre et Synthèse d'Exploration
- Domaine analysé : ${domain}
- Architecture applicative : ${framework}
- Objectif : Indexabilité souveraine, conformité Web Vitals et zéro friction d'exploration.

## 2. Infrastructure et Réponses Serveur
- Codes HTTP : Surveillance stricte des redirections 301 et élimination des erreurs 404/500.
- Protocole : HTTPS obligatoire, en-têtes HSTS et certificats actifs.
- Directives d'exploration : Fichier robots.txt validé sans blocage accidentel des routes publiques.

## 3. Performance et Core Web Vitals
- LCP (Largest Contentful Paint) : Cible inférieure à 2.5 secondes via optimisation des images WebP/AVIF.
- INP (Interaction to Next Paint) : Cible inférieure à 200 ms par allègement du fil d'exécution JavaScript.
- CLS (Cumulative Layout Shift) : Score inférieur à 0.1 par réservation explicite des dimensions multimédias.
`,

    '02-architecture-information.md': `# Architecture de l'Information et Arborescence - ${projectName}

## 1. Principes Directeurs
- Profondeur d'exploration : Toutes les pages stratégiques accessibles en moins de 3 clics depuis l'accueil.
- Segmentation thématique : Séparation étanche entre les silos marketing et applicatifs.

## 2. Typologie des Silos et Hiérarchie
- Niveau 0 : Page d'accueil (${domain}/)
- Niveau 1 : Pages piliers thématiques et offres phares
- Niveau 2 : Sous-thématiques expertes et articles spécialisés
- Niveau 3 : Fiches pratiques et études de cas
`,

    '03-strategie-mots-cles.md': `# Stratégie de Mots-Clés et Intentions de Recherche - ${projectName}

## 1. Cartographie des Intentions
- Requêtes Transactionnelles : Ciblage à forte intention d'achat sur les pages produits et tarifs.
- Requêtes Commerciales : Comparatifs et critères d'évaluation pour accompagner la décision.
- Requêtes Informationnelles : Guides pratiques et définitions pour alimenter le cocon sémantique.

## 2. Matrice d'Opportunités
- Volumétrie ciblée : Priorisation du compromis volume/faisabilité (mots-clés de moyenne et longue traîne).
- Difficulté SEO (KD) : Capitalisation initiale sur les requêtes à faible concurrence pour asseoir l'autorité.
`,

    '04-plan-cocon-semantique.md': `# Plan de Cocon Sémantique et Thématisation - ${projectName}

## 1. Modélisation du Silo Pilier
- Page Mère (Pilier) : Guide exhaustif à visée généraliste et forte autorité.
- Pages Filles (Satellites) : Articles spécialisés traitant un angle précis de la problématique.

## 2. Décloisonnement et Étanchéité Sémantique
- Les liens circulent de manière ascendante (fille vers mère) et transversale (entre sœurs de même niveau).
- Aucun lien sortant vers des silos sémantiquement distants pour préserver le flux thématique.
`,

    '05-briefs-redactionnels.md': `# Briefs Rédactionnels d'Excellence - ${projectName}

## 1. Spécifications Générales
- Longueur cible : Entre 1 200 et 2 000 mots selon la concurrence de la SERP.
- Balisage : 1 balise H1 unique, structure H2/H3 logique, zéro saut de niveau.
- Optimisation GEO : Paragraphe de synthèse direct sous chaque H2 pour captation par les moteurs d'IA.

## 2. Modèle de Brief Type
- Titre optimisé (50-60 caractères)
- Méta-description engageante (140-155 caractères avec verbe d'action)
- Plan détaillé des sections et questions fréquentes (FAQ)
`,

    '06-optimisation-on-page.md': `# Optimisation On-Page et Métadonnées - ${projectName}

## 1. Règles Strictes de Rédaction des Balises
- Balise Title : 50 à 60 caractères, mot-clé principal au début, élimination de la duplication de marque.
- Méta Description : 140 à 155 caractères, proposition de valeur claire et appel à l'action précis.
- URL Canonique : URL absolue systématique pour éviter toute ambiguïté de contenu dupliqué.

## 2. Données Structurées Schema.org
- Implémentation du balisage JSON-LD : Organization, WebSite, Article et FAQPage.
`,

    '07-strategie-maillage-interne.md': `# Stratégie de Maillage Interne et PageRank Thématique - ${projectName}

## 1. Directives de Liens Internes
- Ancrages : Ancrages textuels descriptifs et variés, interdiction des ancrages génériques ("cliquez ici").
- Équilibre des liens : Distribution homogène du jus de lien vers les pages à fort enjeu de conversion.
- Fil d'Ariane : Breadcrumbs structurés avec données JSON-LD sur l'ensemble des pages profondes.
`,

    '08-plan-netlinking-autorite.md': `# Plan de Netlinking et Autorité Thématique - ${projectName}

## 1. Objectifs de Domaine Rating (DR)
- Acquisition de liens naturels depuis des médias sectoriels et partenaires professionnels.
- Diversification des domaines référents : Privilégier la pertinence contextuelle plutôt que la quantité brute.

## 2. Tactiques Déployables
- Publication d'études de référence et baromètres sectoriels (linkbaiting naturel).
- Relations presse ciblées et contributions d'experts invités.
`,

    '09-tableau-bord-suivi-kpi.md': `# Tableau de Bord et Suivi des Indicateurs Clés (KPI) - ${projectName}

## 1. Indicateurs de Visibilité et Positionnement
- Impressions globales Search Console : Surveillance hebdomadaire de la croissance globale.
- Nombre de mots-clés en Top 3, Top 10 et Top 20.

## 2. Indicateurs de Trafic et Conversion
- Clics organiques et Taux de Clic (CTR) moyen.
- Taux de conversion des visiteurs organiques en prospects qualifiés ou utilisateurs actifs.
`,
  };

  for (const [filename, content] of Object.entries(deliverables)) {
    const fullPath = path.join(docsSeoDir, filename);
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf-8');
    generatedFiles.push(fullPath);
  }

  return generatedFiles;
}

