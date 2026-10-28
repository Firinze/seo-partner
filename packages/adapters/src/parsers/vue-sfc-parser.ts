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

export function parseVueSfc(
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

  // 1. Scan script block: <script setup> or <script>
  const scriptMatch = /<script\b[^>]*>([\s\S]*?)<\/script>/i.exec(fileContent);
  if (scriptMatch && scriptMatch[1]) {
    const scriptContent = scriptMatch[1];
    const scriptOffset = scriptMatch.index;

    // useSeoMeta({ ... })
    const useSeoMetaMatch = /useSeoMeta\s*\(\s*\{([\s\S]*?)\}\s*\)/i.exec(scriptContent);
    if (useSeoMetaMatch && useSeoMetaMatch[1]) {
      const metaBody = useSeoMetaMatch[1];
      const callLine = lineNumberAtOffset(fileContent, scriptOffset + useSeoMetaMatch.index);

      // title: '...' or title: "..."
      const titleProp = /title\s*:\s*["']([^"']+)["']/i.exec(metaBody);
      if (titleProp && !title) {
        title = { value: titleProp[1] ?? '', line: callLine };
      } else if (/title\s*:\s*[`()]/i.test(metaBody) && !title) {
        title = { value: '[Valeur dynamique]', line: callLine };
        isDynamic = true;
      }

      // description: '...'
      const descProp = /description\s*:\s*["']([^"']+)["']/i.exec(metaBody);
      if (descProp && !description) {
        description = { value: descProp[1] ?? '', line: callLine };
      }

      // robots: '...'
      const robotsProp = /robots\s*:\s*["']([^"']+)["']/i.exec(metaBody);
      if (robotsProp && !robots) {
        robots = { value: robotsProp[1] ?? '', line: callLine };
      }

      // ogTitle, ogDescription
      const ogTitleProp = /ogTitle\s*:\s*["']([^"']+)["']/i.exec(metaBody);
      if (ogTitleProp) openGraph['title'] = ogTitleProp[1] ?? '';
      const ogDescProp = /ogDescription\s*:\s*["']([^"']+)["']/i.exec(metaBody);
      if (ogDescProp) openGraph['description'] = ogDescProp[1] ?? '';
    }

    // useHead({ ... })
    const useHeadMatch = /useHead\s*\(\s*\{([\s\S]*?)\}\s*\)/i.exec(scriptContent);
    if (useHeadMatch && useHeadMatch[1]) {
      const headBody = useHeadMatch[1];
      const callLine = lineNumberAtOffset(fileContent, scriptOffset + useHeadMatch.index);

      const titleProp = /title\s*:\s*["']([^"']+)["']/i.exec(headBody);
      if (titleProp && !title) {
        title = { value: titleProp[1] ?? '', line: callLine };
      } else if (/title\s*:\s*[`()]/i.test(headBody) && !title) {
        title = { value: '[Valeur dynamique]', line: callLine };
        isDynamic = true;
      }
    }
  }

  // 2. Scan template block for components: <Title>, <Meta>, <NuxtLink>, <html lang>
  const templateMatch = /<template\b[^>]*>([\s\S]*?)<\/template>/i.exec(fileContent);
  const templateContent = templateMatch && templateMatch[1] ? templateMatch[1] : fileContent;
  const templateOffset = templateMatch ? templateMatch.index : 0;

  // <html lang="...">
  const htmlTagMatch = /<html\b([^>]*?)>/i.exec(templateContent);
  if (htmlTagMatch) {
    const langVal = getAttr(htmlTagMatch[1] ?? '', 'lang');
    if (langVal) {
      htmlLang = {
        value: langVal.trim(),
        line: lineNumberAtOffset(fileContent, templateOffset + htmlTagMatch.index),
      };
    }
  }

  // <Title>...</Title> or <title>...</title>
  const titleTagMatch = /<[Tt]itle[^>]*>([\s\S]*?)<\/[Tt]itle>/i.exec(templateContent);
  if (titleTagMatch && !title) {
    const rawVal = (titleTagMatch[1] ?? '').trim();
    const line = lineNumberAtOffset(fileContent, templateOffset + titleTagMatch.index);
    if (/\{\{[^}]+\}\}/.test(rawVal)) {
      title = { value: '[Valeur dynamique]', line };
      isDynamic = true;
    } else {
      title = { value: rawVal.replace(/\s+/g, ' '), line };
    }
  }

  // <Meta name="..." content="..." /> or <meta ...>
  const metaRegex = /<[Mm]eta\b([^>]*?)\/?>/gi;
  let mMatch: RegExpExecArray | null;
  while ((mMatch = metaRegex.exec(templateContent)) !== null) {
    const attrs = mMatch[1] ?? '';
    const line = lineNumberAtOffset(fileContent, templateOffset + mMatch.index);
    const nameVal = getAttr(attrs, 'name')?.toLowerCase();
    const contentVal = getAttr(attrs, 'content');
    if (nameVal === 'description' && contentVal !== null && !description) {
      description = { value: contentVal, line };
    } else if (nameVal === 'robots' && contentVal !== null && !robots) {
      robots = { value: contentVal, line };
    }
  }

  // Headings: <h1> to <h6>
  const headingRegex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(templateContent)) !== null) {
    const level = Number(hMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6;
    const text = (hMatch[2] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    headings.push({
      level,
      text,
      line: lineNumberAtOffset(fileContent, templateOffset + hMatch.index),
    });
  }

  // Links: <NuxtLink to="..."> or <a href="...">
  const nuxtLinkRegex = /<NuxtLink\b([^>]*?)>([\s\S]*?)<\/NuxtLink>/gi;
  let nlMatch: RegExpExecArray | null;
  while ((nlMatch = nuxtLinkRegex.exec(templateContent)) !== null) {
    const attrs = nlMatch[1] ?? '';
    const to = getAttr(attrs, 'to') || getAttr(attrs, ':to') || getAttr(attrs, 'href');
    if (to) {
      const anchorText = (nlMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
      links.push({
        toUrl: to,
        anchorText,
        kind: to.startsWith('http://') || to.startsWith('https://') ? 'external' : 'internal',
        rel: getAttr(attrs, 'rel'),
        line: lineNumberAtOffset(fileContent, templateOffset + nlMatch.index),
      });
    }
  }

  const aRegex = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = aRegex.exec(templateContent)) !== null) {
    const attrs = aMatch[1] ?? '';
    const href = getAttr(attrs, 'href');
    if (href) {
      const anchorText = (aMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
      links.push({
        toUrl: href,
        anchorText,
        kind: href.startsWith('http://') || href.startsWith('https://') ? 'external' : 'internal',
        rel: getAttr(attrs, 'rel'),
        line: lineNumberAtOffset(fileContent, templateOffset + aMatch.index),
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

