export interface PageSemantics {
  h1: string | null;
  h2s: string[];
  paragraphs: string[];
  valueProposition: string | null;
  pageContext: string;
}

export function extractPageSemantics(sourceCode: string, fileName: string): PageSemantics {
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(sourceCode) ||
    /^#\s+(.+)$/m.exec(sourceCode);
  const cleanH1 = h1Match ? stripTagsAndCode(h1Match[1] ?? '') : null;

  const h2s: string[] = [];
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(sourceCode)) !== null) {
    if (match[1]) {
      const clean = stripTagsAndCode(match[1]);
      if (clean && !h2s.includes(clean)) {
        h2s.push(clean);
      }
    }
  }

  // Also check markdown ## if empty
  if (h2s.length === 0) {
    const mdH2Regex = /^##\s+(.+)$/gm;
    while ((match = mdH2Regex.exec(sourceCode)) !== null) {
      if (match[1]) {
        h2s.push(match[1].trim());
      }
    }
  }

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pRegex.exec(sourceCode)) !== null) {
    if (match[1]) {
      const clean = stripTagsAndCode(match[1]);
      if (clean.length > 20 && !paragraphs.includes(clean)) {
        paragraphs.push(clean);
      }
    }
  }

  const valueProposition = paragraphs.length > 0 ? paragraphs[0] ?? null : null;

  return {
    h1: cleanH1,
    h2s,
    paragraphs,
    valueProposition,
    pageContext: fileName,
  };
}

function stripTagsAndCode(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '') // strip html tags
    .replace(/\{[^}]+\}/g, '') // strip jsx curly braces
    .replace(/\{\{[^}]+\}\}/g, '') // strip blade/twig braces
    .replace(/\s+/g, ' ')
    .trim();
}

