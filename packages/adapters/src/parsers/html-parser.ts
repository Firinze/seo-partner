import type {
  DiscoveredRoute,
  ExtractedRouteData,
  HeadingItem,
  ImageItem,
  JsonLdItem,
  LinkItem,
} from '@seo-partner/core';

function lineNumberAtOffset(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function getAttr(attrsRaw: string, attrName: string): string | null {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = re.exec(attrsRaw);
  return m ? (m[1] ?? null) : null;
}

export function parseStaticHtmlOrMarkdown(
  route: DiscoveredRoute,
  fileContent: string,
): ExtractedRouteData {
  let title: { value: string; line: number } | null = null;
  let description: { value: string; line: number } | null = null;
  let canonical: { value: string; line: number } | null = null;
  let robots: { value: string; line: number } | null = null;
  let htmlLang: { value: string; line: number } | null | undefined = undefined;
  const openGraph: Record<string, string> = {};
  const hreflang: Array<{ lang: string; url: string }> = [];
  const headings: HeadingItem[] = [];
  const images: ImageItem[] = [];
  const links: LinkItem[] = [];
  const jsonLdItems: JsonLdItem[] = [];

  if (route.routerKind === 'markdown') {
    const lines = fileContent.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const lineText = lines[i] ?? '';
      const lineNum = i + 1;
      const titleFm = /^title:\s*["']?(.+?)["']?$/i.exec(lineText.trim());
      if (titleFm && !title) {
        title = { value: (titleFm[1] ?? '').trim(), line: lineNum };
      }
      const descFm = /^description:\s*["']?(.+?)["']?$/i.exec(lineText.trim());
      if (descFm && !description) {
        description = { value: (descFm[1] ?? '').trim(), line: lineNum };
      }
      const hMatch = /^(#{1,6})\s+(.+)$/.exec(lineText.trim());
      if (hMatch) {
        const level = (hMatch[1]?.length ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
        headings.push({ level, text: (hMatch[2] ?? '').trim(), line: lineNum });
      }
    }
    return {
      route,
      title,
      description,
      canonical,
      robots,
      headings,
      openGraph,
      hreflang,
      images,
      links,
      jsonLdItems,
    };
  }

  const htmlTagMatch = /<html\b([^>]*?)>/i.exec(fileContent);
  if (htmlTagMatch) {
    const langVal = getAttr(htmlTagMatch[1] ?? '', 'lang') ?? '';
    htmlLang = {
      value: langVal.trim(),
      line: lineNumberAtOffset(fileContent, htmlTagMatch.index),
    };
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(fileContent);
  if (titleMatch) {
    title = {
      value: (titleMatch[1] ?? '').replace(/\s+/g, ' ').trim(),
      line: lineNumberAtOffset(fileContent, titleMatch.index),
    };
  }

  const metaRegex = /<meta\b([^>]*?)\/?>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRegex.exec(fileContent)) !== null) {
    const attrs = metaMatch[1] ?? '';
    const line = lineNumberAtOffset(fileContent, metaMatch.index);
    const nameVal = getAttr(attrs, 'name')?.toLowerCase();
    const propVal = getAttr(attrs, 'property')?.toLowerCase();
    const contentVal = getAttr(attrs, 'content');
    if (nameVal === 'description' && contentVal !== null && !description) {
      description = { value: contentVal, line };
    } else if (nameVal === 'robots' && contentVal !== null && !robots) {
      robots = { value: contentVal, line };
    } else if (propVal?.startsWith('og:') && contentVal !== null) {
      openGraph[propVal.slice(3)] = contentVal;
    }
  }

  const linkTagRegex = /<link\b([^>]*?)\/?>/gi;
  let linkTagMatch: RegExpExecArray | null;
  while ((linkTagMatch = linkTagRegex.exec(fileContent)) !== null) {
    const attrs = linkTagMatch[1] ?? '';
    const line = lineNumberAtOffset(fileContent, linkTagMatch.index);
    const relVal = getAttr(attrs, 'rel')?.toLowerCase();
    const hrefVal = getAttr(attrs, 'href');
    if (relVal === 'canonical' && hrefVal !== null && !canonical) {
      canonical = { value: hrefVal, line };
    } else if (relVal === 'alternate' && hrefVal !== null) {
      const hl = getAttr(attrs, 'hreflang');
      if (hl) hreflang.push({ lang: hl, url: hrefVal });
    }
  }

  const headingRegex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(fileContent)) !== null) {
    const level = Number(hMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6;
    const text = (hMatch[2] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    headings.push({
      level,
      text,
      line: lineNumberAtOffset(fileContent, hMatch.index),
    });
  }

  const imgRegex = /<img\b([^>]*?)\/?>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(fileContent)) !== null) {
    const attrs = imgMatch[1] ?? '';
    const srcVal = getAttr(attrs, 'src') ?? '';
    const altVal = getAttr(attrs, 'alt');
    images.push({
      src: srcVal,
      alt: altVal,
      hasAlt: altVal !== null && altVal.trim().length > 0,
      width: getAttr(attrs, 'width'),
      height: getAttr(attrs, 'height'),
      line: lineNumberAtOffset(fileContent, imgMatch.index),
    });
  }

  const anchorRegex = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = anchorRegex.exec(fileContent)) !== null) {
    const attrs = aMatch[1] ?? '';
    const hrefVal = getAttr(attrs, 'href');
    if (hrefVal) {
      links.push({
        toUrl: hrefVal,
        anchorText: (aMatch[2] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
        kind: /^https?:\/\//i.test(hrefVal) ? 'external' : 'internal',
        rel: getAttr(attrs, 'rel'),
        line: lineNumberAtOffset(fileContent, aMatch.index),
      });
    }
  }

  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = scriptRegex.exec(fileContent)) !== null) {
    const rawJson = (sMatch[1] ?? '').trim();
    const line = lineNumberAtOffset(fileContent, sMatch.index);
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      const contextVal = parsed['@context'];
      const typeVal = parsed['@type'];
      const isValid =
        typeof contextVal === 'string' &&
        contextVal.includes('schema.org') &&
        typeof typeVal === 'string' &&
        typeVal.trim().length > 0;
      jsonLdItems.push({
        schemaType: typeof typeVal === 'string' ? typeVal : null,
        rawJson,
        isValid,
        validationError: isValid ? null : 'Missing @context (schema.org) or @type',
        line,
      });
    } catch (err) {
      jsonLdItems.push({
        schemaType: null,
        rawJson,
        isValid: false,
        validationError: err instanceof Error ? err.message : 'Invalid JSON',
        line,
      });
    }
  }

  return {
    route,
    title,
    description,
    canonical,
    robots,
    ...(htmlLang !== undefined ? { htmlLang } : {}),
    headings,
    openGraph,
    hreflang,
    images,
    links,
    jsonLdItems,
  };
}

