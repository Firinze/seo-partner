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

export interface AstroParseResult {
  readonly routeData: ExtractedRouteData;
  readonly layoutReference?: string;
  readonly layoutProps?: Record<string, string>;
}

export function parseAstroOrMarkdown(
  route: DiscoveredRoute,
  fileContent: string,
): AstroParseResult {
  let title: { value: string; line: number } | null = null;
  let description: { value: string; line: number } | null = null;
  let canonical: { value: string; line: number } | null = null;
  let robots: { value: string; line: number } | null = null;
  let htmlLang: { value: string; line: number } | null | undefined = undefined;
  let isDynamic = false;
  let layoutReference: string | undefined = undefined;
  const layoutProps: Record<string, string> = {};

  const openGraph: Record<string, string> = {};
  const hreflang: Array<{ lang: string; url: string }> = [];
  const headings: HeadingItem[] = [];
  const images: ImageItem[] = [];
  const links: LinkItem[] = [];
  const jsonLdItems: JsonLdItem[] = [];

  const lines = fileContent.split(/\r?\n/);

  // 1. Check for YAML frontmatter (Astro / Markdown / MDX)
  const frontmatterMatch = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch && frontmatterMatch[1]) {
    const fmLines = frontmatterMatch[1].split(/\r?\n/);
    for (let i = 0; i < fmLines.length; i += 1) {
      const lineText = (fmLines[i] ?? '').trim();
      const lineNum = i + 2; // 1-based, after opening '---'

      // YAML: title: "..."
      const yTitle = /^title:\s*["']?(.+?)["']?$/i.exec(lineText);
      if (yTitle && !title) {
        title = { value: (yTitle[1] ?? '').trim(), line: lineNum };
      }

      // YAML: description: "..."
      const yDesc = /^description:\s*["']?(.+?)["']?$/i.exec(lineText);
      if (yDesc && !description) {
        description = { value: (yDesc[1] ?? '').trim(), line: lineNum };
      }

      // YAML: layout: "..."
      const yLayout = /^layout:\s*["']?(.+?)["']?$/i.exec(lineText);
      if (yLayout && !layoutReference) {
        layoutReference = (yLayout[1] ?? '').trim();
      }

      // JS frontmatter: const title = "..." or const title = `...`
      const jsConstTitle = /(?:const|let|var)\s+title\s*=\s*["']([^"']+)["']/i.exec(lineText);
      if (jsConstTitle && !title) {
        title = { value: jsConstTitle[1] ?? '', line: lineNum };
      } else {
        // Dynamic expression: e.g. const title = `...${slug}...`
        const jsDynamicTitle = /(?:const|let|var)\s+title\s*=\s*[`{]/i.exec(lineText);
        if (jsDynamicTitle && !title) {
          title = { value: '[Valeur dynamique]', line: lineNum };
          isDynamic = true;
        }
      }

      // JS frontmatter: const description = "..."
      const jsConstDesc = /(?:const|let|var)\s+description\s*=\s*["']([^"']+)["']/i.exec(lineText);
      if (jsConstDesc && !description) {
        description = { value: jsConstDesc[1] ?? '', line: lineNum };
      }
    }
  }

  // 2. Look for Layout component in template: e.g. <BaseLayout title="My Title" ...>
  const layoutComponentMatch = /<([A-Z][a-zA-Z0-9]*Layout)\b([^>]*?)>/i.exec(fileContent);
  if (layoutComponentMatch) {
    const layoutTag = layoutComponentMatch[1] ?? '';
    layoutReference = layoutTag;
    const attrs = layoutComponentMatch[2] ?? '';
    const line = lineNumberAtOffset(fileContent, layoutComponentMatch.index);

    // Check title prop: title="..." or title={...}
    const propTitle = getAttr(attrs, 'title');
    if (propTitle && !title) {
      title = { value: propTitle, line };
    } else if (/\btitle=\{([^}]+)\}/i.test(attrs) && !title) {
      // If title={title} and title was already set from frontmatter const, keep it; else dynamic
      if (!title) {
        title = { value: '[Valeur dynamique]', line };
        isDynamic = true;
      }
    }

    const propDesc = getAttr(attrs, 'description');
    if (propDesc && !description) {
      description = { value: propDesc, line };
    }
  }

  // 3. Direct HTML tags: <html lang="...">
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

  // Direct <title>
  const titleTagMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(fileContent);
  if (titleTagMatch && !title) {
    const rawVal = (titleTagMatch[1] ?? '').trim();
    const line = lineNumberAtOffset(fileContent, titleTagMatch.index);
    if (/\{[^}]+\}/.test(rawVal)) {
      title = { value: '[Valeur dynamique]', line };
      isDynamic = true;
    } else {
      title = { value: rawVal.replace(/\s+/g, ' '), line };
    }
  }

  // Direct <meta name="description">, <meta name="robots">, <link rel="canonical">
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

  const linkRegex = /<link\b([^>]*?)\/?>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(fileContent)) !== null) {
    const attrs = linkMatch[1] ?? '';
    const line = lineNumberAtOffset(fileContent, linkMatch.index);
    const relVal = getAttr(attrs, 'rel')?.toLowerCase();
    const hrefVal = getAttr(attrs, 'href');
    if (relVal === 'canonical' && hrefVal !== null && !canonical) {
      canonical = { value: hrefVal, line };
    } else if (relVal === 'alternate' && hrefVal !== null) {
      const hl = getAttr(attrs, 'hreflang');
      if (hl) hreflang.push({ lang: hl, url: hrefVal });
    }
  }

  // 4. Headings: HTML <h1>-<h6> or Markdown #
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

  // Markdown headings (# Title)
  for (let i = 0; i < lines.length; i += 1) {
    const lineText = lines[i] ?? '';
    const mdHMatch = /^(#{1,6})\s+(.+)$/.exec(lineText.trim());
    if (mdHMatch) {
      const level = (mdHMatch[1]?.length ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
      headings.push({
        level,
        text: (mdHMatch[2] ?? '').trim(),
        line: i + 1,
      });
    }
  }

  // 5. Links: <a href="...">
  const aRegex = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = aRegex.exec(fileContent)) !== null) {
    const attrs = aMatch[1] ?? '';
    const href = getAttr(attrs, 'href');
    if (href) {
      const anchorText = (aMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
      const kind = href.startsWith('http://') || href.startsWith('https://') ? 'external' : 'internal';
      links.push({
        toUrl: href,
        anchorText,
        kind,
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
    layoutReference,
    layoutProps,
  };
}

