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

export interface DtlParseResult {
  readonly routeData: ExtractedRouteData;
  readonly extendsTemplate?: string;
}

export function parseDjangoTemplate(
  route: DiscoveredRoute,
  fileContent: string,
): DtlParseResult {
  let title: { value: string; line: number } | null = null;
  let description: { value: string; line: number } | null = null;
  let canonical: { value: string; line: number } | null = null;
  let robots: { value: string; line: number } | null = null;
  let htmlLang: { value: string; line: number } | null | undefined = undefined;
  let isDynamic = false;
  let extendsTemplate: string | undefined = undefined;

  const openGraph: Record<string, string> = {};
  const hreflang: Array<{ lang: string; url: string }> = [];
  const headings: HeadingItem[] = [];
  const images: ImageItem[] = [];
  const links: LinkItem[] = [];
  const jsonLdItems: JsonLdItem[] = [];

  // 1. Check for {% extends 'base.html' %}
  const extendsMatch = /\{%\s*extends\s+['"]([^'"]+)['"]\s*%\}/i.exec(fileContent);
  if (extendsMatch && extendsMatch[1]) {
    extendsTemplate = extendsMatch[1].replace(/\\/g, '/');
  }

  // 2. Check for {% block title %}...{% endblock %}
  const blockTitleMatch = /\{%\s*block\s+title\s*%\}([\s\S]*?)\{%\s*endblock\s*(?:title)?\s*%\}/i.exec(fileContent);
  if (blockTitleMatch && blockTitleMatch[1]) {
    const rawTitle = blockTitleMatch[1].trim();
    const line = lineNumberAtOffset(fileContent, blockTitleMatch.index);
    if (/\{\{[^}]+\}\}/.test(rawTitle)) {
      title = { value: '[Valeur dynamique]', line };
      isDynamic = true;
    } else {
      title = { value: rawTitle.replace(/\s+/g, ' '), line };
    }
  }

  // 3. Check for direct <title>...</title>
  if (!title) {
    const directTitleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(fileContent);
    if (directTitleMatch && directTitleMatch[1]) {
      const rawTitle = directTitleMatch[1].trim();
      const line = lineNumberAtOffset(fileContent, directTitleMatch.index);
      if (/\{\{[^}]+\}\}/.test(rawTitle) || /\{%/.test(rawTitle)) {
        title = { value: '[Valeur dynamique]', line };
        isDynamic = true;
      } else {
        title = { value: rawTitle.replace(/\s+/g, ' '), line };
      }
    }
  }

  // 4. Check for <html lang="...">
  const htmlTagMatch = /<html\b([^>]*?)>/i.exec(fileContent);
  if (htmlTagMatch) {
    const langVal = getAttr(htmlTagMatch[1] ?? '', 'lang');
    if (langVal) {
      htmlLang = {
        value: langVal.trim(),
        line: lineNumberAtOffset(fileContent, htmlTagMatch.index),
      };
    }
  }

  // 5. Meta tags: <meta name="description" ...>
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

  // 6. Headings: <h1> to <h6>
  const headingRegex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(fileContent)) !== null) {
    const level = Number(hMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6;
    const text = (hMatch[2] ?? '')
      .replace(/<[^>]+>/g, '')
      .replace(/\{[{%][\s\S]*?[}%]\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    headings.push({
      level,
      text,
      line: lineNumberAtOffset(fileContent, hMatch.index),
    });
  }

  // 7. Links: <a href="...">
  const aRegex = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = aRegex.exec(fileContent)) !== null) {
    const attrs = aMatch[1] ?? '';
    const href = getAttr(attrs, 'href');
    if (href) {
      const anchorText = (aMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
      links.push({
        toUrl: href,
        anchorText,
        kind: href.startsWith('http://') || href.startsWith('https://') ? 'external' : 'internal',
        rel: getAttr(attrs, 'rel'),
        line: lineNumberAtOffset(fileContent, aMatch.index),
      });
    }
  }

  return {
    routeData: {
      route,
      title,
      description,
      canonical,
      robots,
      htmlLang,
      headings,
      openGraph,
      hreflang,
      images,
      links,
      jsonLdItems,
      isDynamic,
    },
    extendsTemplate,
  };
}

