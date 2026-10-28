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

export function parseRemixRoute(
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

  // 1. Check for <html lang="..."> in JSX (e.g. app/root.tsx)
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

  // 2. Scan for export const meta = ...
  // Pattern 1: array return in arrow function or array literal
  // export const meta = () => [ ... ]; or export const meta = [ ... ];
  const metaMatch = /export\s+const\s+meta\b[^=]*=\s*(?:(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*)?(?:\{[\s\S]*?return\s+)?\[([\s\S]*?)\]/i.exec(fileContent);
  if (metaMatch && metaMatch[1]) {
    const metaArrayContent = metaMatch[1];
    const metaOffset = metaMatch.index;
    const metaLine = lineNumberAtOffset(fileContent, metaOffset);

    // Extract { title: "..." }
    const titleMatch = /\{\s*title\s*:\s*["']([^"']+)["']\s*\}/i.exec(metaArrayContent);
    if (titleMatch) {
      title = { value: titleMatch[1] ?? '', line: metaLine };
    } else {
      // Dynamic title expression: { title: data?.title || "..." } or { title: data ? ... }
      const fallbackTitle = /\{\s*title\s*:\s*[^"'\n\r}]*?["']([^"']+)["']/i.exec(metaArrayContent);
      if (fallbackTitle) {
        title = { value: fallbackTitle[1] ?? '', line: metaLine };
      } else if (/\{\s*title\s*:/i.test(metaArrayContent)) {
        title = { value: '[Valeur dynamique]', line: metaLine };
        isDynamic = true;
      }
    }

    // Extract { name: "description", content: "..." }
    const descMatch = /\{\s*name\s*:\s*["']description["']\s*,\s*content\s*:\s*["']([^"']+)["']/i.exec(metaArrayContent);
    if (descMatch) {
      description = { value: descMatch[1] ?? '', line: metaLine };
    }

    // Extract { name: "robots", content: "..." }
    const robotsMatch = /\{\s*name\s*:\s*["']robots["']\s*,\s*content\s*:\s*["']([^"']+)["']/i.exec(metaArrayContent);
    if (robotsMatch) {
      robots = { value: robotsMatch[1] ?? '', line: metaLine };
    }

    // Extract canonical: { tagName: "link", rel: "canonical", href: "..." }
    const canonicalMatch = /rel\s*:\s*["']canonical["']\s*,\s*href\s*:\s*["']([^"']+)["']/i.exec(metaArrayContent);
    if (canonicalMatch) {
      canonical = { value: canonicalMatch[1] ?? '', line: metaLine };
    }
  }

  // 3. Headings in JSX: <h1> to <h6>
  const headingRegex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(fileContent)) !== null) {
    const level = Number(hMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6;
    const text = (hMatch[2] ?? '').replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
    headings.push({
      level,
      text,
      line: lineNumberAtOffset(fileContent, hMatch.index),
    });
  }

  // 4. Links: <Link to="..."> or <a href="...">
  const linkRegex = /<(?:Link|NavLink)\b([^>]*?)>([\s\S]*?)<\/(?:Link|NavLink)>/gi;
  let lMatch: RegExpExecArray | null;
  while ((lMatch = linkRegex.exec(fileContent)) !== null) {
    const attrs = lMatch[1] ?? '';
    const to = getAttr(attrs, 'to') || getAttr(attrs, 'href');
    if (to) {
      const anchorText = (lMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
      links.push({
        toUrl: to,
        anchorText,
        kind: to.startsWith('http://') || to.startsWith('https://') ? 'external' : 'internal',
        rel: getAttr(attrs, 'rel'),
        line: lineNumberAtOffset(fileContent, lMatch.index),
      });
    }
  }

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

