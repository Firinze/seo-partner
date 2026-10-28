# Veille SEO & Mises à Jour Officielles

Dernière vérification : 2026-10-28
Last Verified: 2026-10-28

## 1. Sources Officielles Obligatoires

- **Google Search Status Dashboard** : `https://status.search.google.com/` (historique des Core Updates, Spam Updates, Reviews Updates).
- **Google Search Central Changelog** : `https://developers.google.com/search/updates`
- **Politiques concernant le spam dans la recherche Web Google** : `https://developers.google.com/search/docs/essentials/spam-policies`
- **Documentation Données Structurées Google** : `https://developers.google.com/search/docs/appearance/structured-data/search-gallery`
- **Google Business Profile Help** : `https://support.google.com/business`

## 2. État des Règles Fondamentales Confirmées

| Domaine | Règle confirmée | Source officielle |
| --- | --- | --- |
| Indexation | Une directive `noindex` (meta robots ou en-tête X-Robots-Tag) exclut totalement la page de l'index Google, même si elle figure dans le sitemap. | Google Search Central — Block Search indexing |
| Canonical | La balise `rel="canonical"` est un signal fort mais non absolu ; elle doit pointer vers une URL indexable en code HTTP 200. | Google Search Central — Consolidate duplicate URLs |
| Title & Meta | Il n'existe pas de limite stricte en nombre de caractères imposée par l'algorithme, mais l'affichage dans les SERP tronque généralement les titres au-delà de ~60 caractères (~600px) et les descriptions au-delà de ~155-160 caractères. | Google Search Central — Control your title links & snippets |
| Contenu & IA | L'utilisation de l'IA n'est pas pénalisée en soi ; en revanche, la génération de pages en masse sans valeur ajoutée pour manipuler le classement (*Scaled Content Abuse*) est une violation directe des politiques anti-spam. | Google Spam Policies — Scaled content abuse |
| Données structurées | Le balisage JSON-LD doit refléter fidèlement le contenu visible par l'utilisateur sur la page. | General Structured Data Guidelines |

## 3. Règle de Prudence

Toute rumeur de mise à jour ou hypothèse de facteur de classement non documentée dans les sources ci-dessus DOIT être étiquetée **« Rapporté, à vérifier »**.

