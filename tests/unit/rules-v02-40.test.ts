import { describe, expect, it } from 'vitest';
import type { CrawlPage, ExtractedRouteData, Finding, RuleDefinition } from '@seo-partner/core';
import {
  ALL_V02_RULES,
  GEO_RULES,
  LOCAL_RULES,
  ONPAGE_RULES,
  runRulesEngine,
  SCHEMA_RULES,
  TECHNICAL_RULES,
} from '@seo-partner/rules';

describe('40 Verified SEO Rules Catalog (v0.2) & Code vs. Crawl Evaluation', () => {
  it('registers exactly 40 deterministic rules across 5 categories', () => {
    expect(TECHNICAL_RULES).toHaveLength(14);
    expect(ONPAGE_RULES).toHaveLength(14);
    expect(SCHEMA_RULES).toHaveLength(5);
    expect(LOCAL_RULES).toHaveLength(4);
    expect(GEO_RULES).toHaveLength(3);
    expect(ALL_V02_RULES).toHaveLength(40);

    for (const rule of ALL_V02_RULES) {
      expect(rule.officialSourceUrl).toMatch(/^https:\/\/developers\.google\.com\//);
      expect(rule.defaultIce.impact).toBeGreaterThanOrEqual(1);
      expect(rule.defaultIce.confidence).toBeGreaterThanOrEqual(1);
      expect(rule.defaultIce.effort).toBeGreaterThanOrEqual(1);
    }
  });

  it('produces 0 findings across all 40 rules on a fully compliant project and crawl', () => {
    const cleanRoute: ExtractedRouteData = {
      route: {
        pattern: '/',
        filePath: 'resources/views/welcome.blade.php',
        routerKind: 'laravel',
        renderingMode: 'ssr-ssg',
        isPrivate: false,
        inSitemap: true,
      },
      title: {
        value: 'Agence SEO Technique Laravel & Symfony | Audit Performance',
        line: 3,
      },
      description: {
        value:
          'Optimisez le referencement naturel technique de vos applications Laravel, Symfony et Next.js avec notre moteur d audit deterministe et local-first fiable.',
        line: 4,
      },
      canonical: { value: 'https://example.test/', line: 6 },
      robots: { value: 'index, follow', line: 7 },
      htmlLang: { value: 'fr', line: 2 },
      headings: [
        { level: 1, text: 'Agence SEO Technique Laravel', line: 12 },
        { level: 2, text: 'Methodologie Deterministe', line: 15 },
      ],
      openGraph: {
        title: 'Agence SEO Technique Laravel',
        description: 'Optimisez votre visibilite organique.',
        image: 'https://example.test/og.png',
      },
      hreflang: [
        { lang: 'fr-FR', url: 'https://example.test/' },
        { lang: 'x-default', url: 'https://example.test/' },
      ],
      images: [
        {
          src: '/hero.webp',
          alt: 'Architecture SEO Partner',
          hasAlt: true,
          width: 1200,
          height: 630,
          line: 18,
        },
      ],
      links: [
        {
          toUrl: '/contact',
          anchorText: 'Demander un audit technique approfondi',
          kind: 'internal',
          rel: null,
          line: 20,
        },
      ],
      jsonLdItems: [
        {
          schemaType: 'Organization',
          rawJson: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'SEO Partner SAS',
            url: 'https://example.test',
          }),
          isValid: true,
          validationError: null,
          line: 25,
        },
        {
          schemaType: 'LocalBusiness',
          rawJson: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'SEO Partner Paris',
            address: {
              '@type': 'PostalAddress',
              streetAddress: '10 Rue de la Paix',
              addressLocality: 'Paris',
            },
            telephone: '+33 1 40 50 60 70',
            openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification' }],
          }),
          isValid: true,
          validationError: null,
          line: 35,
        },
      ],
    };

    const cleanCrawlPage: CrawlPage = {
      crawlRunId: 'crawl_clean',
      url: 'https://example.test/',
      routePattern: '/',
      statusCode: 200,
      redirectChain: [],
      responseTimeMs: 42,
      depth: 0,
      xRobotsTag: null,
      httpCanonical: 'https://example.test/',
      title: 'Agence SEO Technique Laravel & Symfony | Audit Performance',
      description: cleanRoute.description?.value ?? null,
      canonical: 'https://example.test/',
      robotsMeta: 'index, follow',
      h1: 'Agence SEO Technique Laravel',
      htmlLang: 'fr',
      openGraph: cleanRoute.openGraph,
      hreflang: cleanRoute.hreflang,
      internalLinks: [],
      brokenLinks: [],
      untrustedExternal: true,
      crawledAt: '2026-10-28T10:00:00Z',
    };

    const findings = runRulesEngine({
      project: {
        id: 'proj_v02_clean',
        rootPath: '/tmp/v02-clean',
        name: 'v02-clean',
        frameworks: ['laravel'],
        hasRobotsTxt: true,
        hasSitemap: true,
        createdAt: '2026-10-28T00:00:00Z',
        lastScannedAt: '2026-10-28T00:00:00Z',
      },
      sitemapFilePath: 'public/sitemap.xml',
      routes: [cleanRoute],
      crawlPages: [cleanCrawlPage],
      robotsTxtContent: 'User-agent: *\nAllow: /\n',
      robotsFilePath: 'public/robots.txt',
    });

    expect(findings).toHaveLength(0);
  });

  it('detects all 25 new v0.2 rules across technical, on-page, schema, local, and geo families', () => {
    const routes: ExtractedRouteData[] = [
      {
        route: {
          pattern: '/',
          filePath: 'resources/views/home.blade.php',
          routerKind: 'laravel',
          renderingMode: 'ssr-ssg',
          isPrivate: false,
          inSitemap: true,
        },
        title: {
          value: 'Accueil Plateforme SEO Technique et Audit Localise',
          line: 2,
        },
        description: {
          value:
            'Plateforme d audit SEO technique local-first couvrant les 40 regles verifiees pour Next.js, Laravel, Symfony et environnements Laragon sous Windows.',
          line: 3,
        },
        canonical: { value: 'https://example.test/', line: 4 },
        robots: null,
        htmlLang: { value: '', line: 1 }, // triggers R-TECH-14
        headings: [
          { level: 1, text: 'Titre H1 Duplique', line: 10 }, // triggers R-ONPAGE-10
          { level: 3, text: 'Saut de niveau H2 manquant', line: 12 }, // triggers R-ONPAGE-09
        ],
        openGraph: { title: 'Only OG Title' }, // triggers R-ONPAGE-13
        hreflang: [
          { lang: 'en-UK', url: 'https://example.test/en' }, // triggers R-GEO-01 & R-GEO-02 (missing x-default & self)
        ],
        images: [
          {
            src: '/banner.png',
            alt: 'Banniere',
            hasAlt: true,
            width: null,
            height: null, // triggers R-ONPAGE-11
            line: 15,
          },
        ],
        links: [
          {
            toUrl: '/services',
            anchorText: 'cliquez ici', // triggers R-ONPAGE-12
            kind: 'internal',
            rel: null,
            line: 18,
          },
        ],
        jsonLdItems: [
          {
            schemaType: 'Organization',
            rawJson: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Incomplete Org Without URL',
            }), // triggers R-SCHEMA-02
            isValid: true,
            validationError: null,
            line: 20,
          },
          {
            schemaType: 'Article',
            rawJson: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: 'Incomplete Article',
            }), // triggers R-SCHEMA-03
            isValid: true,
            validationError: null,
            line: 25,
          },
          {
            schemaType: 'Product',
            rawJson: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'Incomplete Product Without Offers',
            }), // triggers R-SCHEMA-04
            isValid: true,
            validationError: null,
            line: 30,
          },
          {
            schemaType: 'FAQPage',
            rawJson: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [],
            }), // triggers R-SCHEMA-05
            isValid: true,
            validationError: null,
            line: 35,
          },
          {
            schemaType: 'LocalBusiness',
            rawJson: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'Agence Sans Adresse Ni Tel',
            }), // triggers R-LOCAL-01, R-LOCAL-02, R-LOCAL-04
            isValid: true,
            validationError: null,
            line: 40,
          },
          {
            schemaType: 'LocalBusiness',
            rawJson: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'Agence Tel National',
              address: { streetAddress: '1 rue Test' },
              telephone: '0140506070', // triggers R-LOCAL-03
              geo: { latitude: 48.85, longitude: 2.35 },
            }),
            isValid: true,
            validationError: null,
            line: 45,
          },
        ],
      },
      {
        route: {
          pattern: '/orphan-page',
          filePath: 'resources/views/orphan.blade.php',
          routerKind: 'laravel',
          renderingMode: 'ssr-ssg',
          isPrivate: false,
          inSitemap: false, // triggers R-TECH-12 (no incoming links + not in sitemap)
        },
        title: {
          value: 'Page Orpheline Non Maillable Dans L Architecture Web',
          line: 2,
        },
        description: {
          value:
            'Cette page publique n est reliee par aucun lien interne et ne figure pas dans le fichier sitemap.xml du projet analyse.',
          line: 3,
        },
        canonical: { value: 'https://example.test/orphan-page', line: 4 },
        robots: null,
        htmlLang: { value: 'fr', line: 1 },
        headings: [{ level: 1, text: 'Titre H1 Duplique', line: 8 }], // triggers R-ONPAGE-10
        openGraph: {},
        hreflang: [],
        images: [],
        links: [],
        jsonLdItems: [],
      },
    ];

    const crawlPages: CrawlPage[] = [
      {
        crawlRunId: 'crawl_1',
        url: 'https://example.test/',
        routePattern: '/',
        statusCode: 200,
        redirectChain: [
          { from: 'https://example.test/old', to: 'https://example.test/mid', status: 301 },
          { from: 'https://example.test/mid', to: 'https://example.test/', status: 302 },
        ], // triggers R-TECH-08
        responseTimeMs: 55,
        depth: 0,
        xRobotsTag: 'noindex', // triggers R-TECH-09
        httpCanonical: 'https://example.test/different-canonical', // triggers R-TECH-10
        title: 'Titre Crawle Different Du Code', // triggers R-ONPAGE-14
        description: null,
        canonical: 'https://example.test/different-canonical',
        robotsMeta: null,
        h1: 'Titre H1 Duplique',
        htmlLang: 'fr',
        openGraph: {},
        hreflang: [],
        internalLinks: ['https://example.test/broken-target'],
        brokenLinks: ['https://example.test/broken-target'], // triggers R-TECH-11
        untrustedExternal: true,
        crawledAt: '2026-10-28T10:00:00Z',
      },
      {
        crawlRunId: 'crawl_1',
        url: 'https://example.test/broken-target',
        routePattern: '/broken-target',
        statusCode: 500, // triggers R-TECH-07
        redirectChain: [],
        responseTimeMs: 120,
        depth: 4, // triggers R-TECH-13
        xRobotsTag: null,
        httpCanonical: null,
        title: null,
        description: null,
        canonical: null,
        robotsMeta: null,
        h1: null,
        htmlLang: 'fr',
        openGraph: {},
        hreflang: [],
        internalLinks: [],
        brokenLinks: [],
        untrustedExternal: true,
        crawledAt: '2026-10-28T10:00:01Z',
      },
    ];

    const findings = runRulesEngine({
      project: {
        id: 'proj_seeded',
        rootPath: '/tmp/seeded',
        name: 'seeded',
        frameworks: ['laravel'],
        hasRobotsTxt: true,
        hasSitemap: true,
        createdAt: '2026-10-28T00:00:00Z',
        lastScannedAt: '2026-10-28T00:00:00Z',
      },
      sitemapFilePath: 'public/sitemap.xml',
      routes,
      crawlPages,
      robotsTxtContent: 'User-agent: *\nDisallow: /\n', // triggers R-GEO-03
      robotsFilePath: 'public/robots.txt',
    });

    const detectedIds = new Set(findings.map((f: Finding) => f.ruleId));

    const expectedNewRuleIds: ReadonlyArray<RuleDefinition['id']> = [
      'R-TECH-07',
      'R-TECH-08',
      'R-TECH-09',
      'R-TECH-10',
      'R-TECH-11',
      'R-TECH-12',
      'R-TECH-13',
      'R-TECH-14',
      'R-ONPAGE-09',
      'R-ONPAGE-10',
      'R-ONPAGE-11',
      'R-ONPAGE-12',
      'R-ONPAGE-13',
      'R-ONPAGE-14',
      'R-SCHEMA-02',
      'R-SCHEMA-03',
      'R-SCHEMA-04',
      'R-SCHEMA-05',
      'R-LOCAL-01',
      'R-LOCAL-02',
      'R-LOCAL-03',
      'R-LOCAL-04',
      'R-GEO-01',
      'R-GEO-02',
      'R-GEO-03',
    ];

    for (const ruleId of expectedNewRuleIds) {
      expect(detectedIds.has(ruleId)).toBe(true);
    }

    // F-R3: Indexing blockers (R-TECH-07 and R-TECH-09) must be sorted at the very top
    expect(findings[0]?.blocksIndexing).toBe(true);
    expect(findings[1]?.blocksIndexing).toBe(true);
  });
});

