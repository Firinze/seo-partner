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

export function parseSvelteComponent(
  route: DiscoveredRoute,
  fileContent: string,
): ExtractedRouteData {
  let title: { value: string; line: number } | null = null;
  let description: { value: string; line: number } | null = null;
  let canonical: { value: string; line: number } | null = null;
  let robots: { value: string; line: number } | null = null;
  let htmlLang: { value: string; line: number } | null | undefined = undefined;
  let isDynamic = false;

  const openGraph: Record<string, string> = {};
  const hreflang: Array<{ lang: string; url: string }> = [];
  const headings: HeadingItem[] = [];
  const images: ImageItem[] = [];
  const links: LinkItem[] = [];
  const jsonLdItems: JsonLdItem[] = [];

  // 1. <html lang="..."> (common in +layout.svelte or root template)
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

  // 2. <svelte:head> block
  const svelteHeadMatch = /<svelte:head>([\s\S]*?)<\/svelte:head>/i.exec(fileContent);
  const headContent = svelteHeadMatch && svelteHeadMatch[1] ? svelteHeadMatch[1] : '';
  const headOffset = svelteHeadMatch ? svelteHeadMatch.index : 0;

  if (headContent) {
    // Title inside <svelte:head>
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(headContent);
    if (titleMatch) {
      const rawVal = (titleMatch[1] ?? '').trim();
      const line = lineNumberAtOffset(fileContent, headOffset + titleMatch.index);
      if (/\{[^}]+\}/.test(rawVal)) {
        title = { value: '[Valeur dynamique]', line };
        isDynamic = true;
      } else {
        title = { value: rawVal.replace(/\s+/g, ' '), line };
      }
    }

    // Meta tags inside <svelte:head>
    const metaRegex = /<meta\b([^>]*?)\/?>/gi;
    let mMatch: RegExpExecArray | null;
    while ((mMatch = metaRegex.exec(headContent)) !== null) {
      const attrs = mMatch[1] ?? '';
      const line = lineNumberAtOffset(fileContent, headOffset + mMatch.index);
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

    // Canonical link inside <svelte:head>
    const linkRegex = /<link\b([^>]*?)\/?>/gi;
    let lMatch: RegExpExecArray | null;
    while ((lMatch = linkRegex.exec(headContent)) !== null) {
      const attrs = lMatch[1] ?? '';
      const line = lineNumberAtOffset(fileContent, headOffset + lMatch.index);
      const relVal = getAttr(attrs, 'rel')?.toLowerCase();
      const hrefVal = getAttr(attrs, 'href');
      if (relVal === 'canonical' && hrefVal !== null && !canonical) {
        canonical = { value: hrefVal, line };
      }
    }
  }

  // Fallback direct <title> if outside <svelte:head>
  if (!title) {
    const directTitleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(fileContent);
    if (directTitleMatch) {
      const rawVal = (directTitleMatch[1] ?? '').trim();
      const line = lineNumberAtOffset(fileContent, directTitleMatch.index);
      if (/\{[^}]+\}/.test(rawVal)) {
        title = { value: '[Valeur dynamique]', line };
        isDynamic = true;
      } else {
        title = { value: rawVal.replace(/\s+/g, ' '), line };
      }
    }
  }

  // 3. Headings: <h1> to <h6>
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

  // 4. Links: <a href="...">
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
  };
}

