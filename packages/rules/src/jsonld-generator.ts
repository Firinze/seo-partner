export interface OrganizationSchemaOptions {
  name: string;
  url: string;
  logoUrl?: string;
  contactEmail?: string;
}

export interface SoftwareAppSchemaOptions {
  name: string;
  operatingSystem?: string;
  applicationCategory?: string;
  price?: string;
  priceCurrency?: string;
  description?: string;
}

export interface ArticleSchemaOptions {
  headline: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  description?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function generateOrganizationJsonLd(options: OrganizationSchemaOptions): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options.name,
    url: options.url,
  };
  if (options.logoUrl) schema['logo'] = options.logoUrl;
  if (options.contactEmail) {
    schema['contactPoint'] = {
      '@type': 'ContactPoint',
      email: options.contactEmail,
      contactType: 'customer support',
    };
  }
  return JSON.stringify(schema, null, 2);
}

export function generateSoftwareApplicationJsonLd(options: SoftwareAppSchemaOptions): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: options.name,
    operatingSystem: options.operatingSystem ?? 'WebBrowser',
    applicationCategory: options.applicationCategory ?? 'BusinessApplication',
  };
  if (options.description) schema['description'] = options.description;
  if (options.price) {
    schema['offers'] = {
      '@type': 'Offer',
      price: options.price,
      priceCurrency: options.priceCurrency ?? 'EUR',
    };
  }
  return JSON.stringify(schema, null, 2);
}

export function generateArticleJsonLd(options: ArticleSchemaOptions): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.headline,
    url: options.url,
    datePublished: options.datePublished,
    dateModified: options.dateModified ?? options.datePublished,
    author: {
      '@type': 'Person',
      name: options.authorName,
    },
  };
  if (options.description) schema['description'] = options.description;
  return JSON.stringify(schema, null, 2);
}

export function generateFaqJsonLd(items: FaqItem[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
  return JSON.stringify(schema, null, 2);
}

