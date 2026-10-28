# Guide de Référence : Données Structurées & Schema.org (`JSON-LD`)

## 1. Règles d'Or (`R-SCHEMA-01`)

1. **Format** : Utiliser exclusivement `JSON-LD` dans une balise `<script type="application/ld+json">`.
2. **Validité syntaxique** : Le JSON doit être strictement valide et inclure `@context: "https://schema.org"` ainsi qu'un `@type` reconnu.
3. **Fidélité absolue** : Ne jamais baliser dans le JSON-LD une information (note d'avis, prix, FAQ, disponibilité) qui n'est pas **visible par l'utilisateur** sur la page.

## 2. Schémas Prioritaires selon le Type de Page

- **Page d'accueil / À propos** : `Organization` ou `LocalBusiness` (avec `name`, `url`, `logo`, `sameAs`, `address`, `telephone`).
- **Pages de services / produits** : `Service` ou `Product` (avec `offers` réels).
- **Articles / Guides** : `Article` ou `BlogPosting` (`headline`, `datePublished`, `dateModified`, `author`).
- **Arborescence** : `BreadcrumbList` sur toutes les pages profondes.

