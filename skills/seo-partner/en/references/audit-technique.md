# Reference Guide: Technical SEO Audit

## 1. Crawling & Control (`robots.txt` & `sitemap.xml`)

- **`robots.txt` (`R-TECH-01`)**: Must be present at `/robots.txt`, return HTTP 200, allow CSS/JS rendering assets, and declare the `Sitemap:` URL.
- **`sitemap.xml` (`R-TECH-02`, `R-TECH-04`)**: Must only list canonical, public, indexable (HTTP 200) URLs. Private routes (`/admin`, `/dashboard`, `/login`, `/api`, `/checkout`) must never appear in the sitemap.

## 2. Indexing & Canonicals

- **Robots directives (`R-TECH-03`)**: Ensure no public landing page carries an accidental `noindex` directive left over from staging.
- **Canonical URL (`R-TECH-05`)**: Every public page must declare an explicit self-referencing or consolidated canonical URL.
- **Auth redirects**: Public pages must never redirect crawlers to login walls.

## 3. Rendering & Core Web Vitals

- **Server vs Client Rendering (`R-TECH-06`)**: Public pages must deliver their primary content and metadata (`<title>`, `<meta name="description">`, `<link rel="canonical">`, `<h1>`) in the initial HTML payload (SSR/SSG).
- **Core Web Vitals thresholds**:
  - **LCP (Largest Contentful Paint)**: `<= 2.5 s`
  - **INP (Interaction to Next Paint)**: `<= 200 ms`
  - **CLS (Cumulative Layout Shift)**: `<= 0.1` (always set explicit `width` and `height` on images).

