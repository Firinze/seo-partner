# Reference Guide: Structured Data & Schema.org (`JSON-LD`)

## 1. Golden Rules (`R-SCHEMA-01`)

1. **Format**: Always use `JSON-LD` inside `<script type="application/ld+json">`.
2. **Syntactic validity**: Must parse as valid JSON and contain `@context: "https://schema.org"` and a non-empty `@type`.
3. **Strict fidelity**: Never mark up data (ratings, prices, FAQs, availability) that is not **visibly rendered** to human visitors on that page.

## 2. Priority Schema Types by Page Role

- **Homepage / About**: `Organization` or `LocalBusiness` (`name`, `url`, `logo`, `sameAs`, `address`, `telephone`).
- **Service / Product pages**: `Service` or `Product` (with accurate `offers`).
- **Articles / Guides**: `Article` or `BlogPosting` (`headline`, `datePublished`, `dateModified`, `author`).
- **Navigation hierarchy**: `BreadcrumbList` across all nested routes.

