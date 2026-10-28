import fs from 'node:fs';
import path from 'node:path';
import type { Finding, PatchProposal, PatchSkipped, SupportedLanguage } from '@seo-partner/core';
import { generateUnifiedDiff, MAX_DIFF_LINES } from './unified-diff.js';
import { resolveSafePath } from './safety.js';

export type FixResult =
  | { readonly ok: true; readonly proposal: PatchProposal }
  | { readonly ok: false; readonly skipped: PatchSkipped };

export interface FixerContext {
  readonly projectRoot: string;
  readonly lang: SupportedLanguage;
}

export function fixFinding(ctx: FixerContext, finding: Finding): FixResult {
  const ruleId = finding.ruleId;

  switch (ruleId) {
    case 'R-TECH-01':
      return fixRobotsTxt(ctx, finding);
    case 'R-TECH-02':
      return fixSitemapXml(ctx, finding);
    case 'R-TECH-03':
      return fixNoindex(ctx, finding);
    case 'R-TECH-05':
      return fixCanonical(ctx, finding);
    case 'R-TECH-14':
      return fixHtmlLang(ctx, finding);
    case 'R-ONPAGE-01':
      return fixTitle(ctx, finding);
    case 'R-ONPAGE-04':
      return fixMetaDescription(ctx, finding);
    default:
      return {
        ok: false,
        skipped: {
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: 'unsupported-rule',
          message: `Rule "${finding.ruleId}" does not have an automated deterministic patch fixer.`,
        },
      };
  }
}

function countTodoMarkers(text: string): number {
  const matches = text.match(/TODO-SEO/g);
  return matches ? matches.length : 0;
}

// ---------------------------------------------------------------------------
// 1. R-TECH-01: Create robots.txt
// ---------------------------------------------------------------------------
function fixRobotsTxt(ctx: FixerContext, finding: Finding): FixResult {
  const publicDir = path.join(ctx.projectRoot, 'public');
  const targetRelPath = fs.existsSync(publicDir) && fs.statSync(publicDir).isDirectory()
    ? 'public/robots.txt'
    : 'robots.txt';

  const safeRes = resolveSafePath(ctx.projectRoot, targetRelPath);
  if (!safeRes.ok || !safeRes.absolutePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'unsafe-path',
        message: safeRes.error ?? 'Unsafe path',
      },
    };
  }

  if (fs.existsSync(safeRes.absolutePath)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: `File "${targetRelPath}" already exists.`,
      },
    };
  }

  const newContent = [
    'User-agent: *',
    'Allow: /',
    'Sitemap: https://TODO-SEO.example/sitemap.xml',
    '',
  ].join('\n');

  const diff = generateUnifiedDiff(targetRelPath, '', newContent, true);

  return {
    ok: true,
    proposal: {
      id: `prop_${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      filePath: targetRelPath,
      kind: 'create',
      hunks: diff.hunks,
      diff: diff.diffText,
      manualReviewRequired: true,
      todoMarkers: countTodoMarkers(newContent),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. R-TECH-02: Create sitemap.xml
// ---------------------------------------------------------------------------
function fixSitemapXml(ctx: FixerContext, finding: Finding): FixResult {
  const publicDir = path.join(ctx.projectRoot, 'public');
  const targetRelPath = fs.existsSync(publicDir) && fs.statSync(publicDir).isDirectory()
    ? 'public/sitemap.xml'
    : 'sitemap.xml';

  const safeRes = resolveSafePath(ctx.projectRoot, targetRelPath);
  if (!safeRes.ok || !safeRes.absolutePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'unsafe-path',
        message: safeRes.error ?? 'Unsafe path',
      },
    };
  }

  if (fs.existsSync(safeRes.absolutePath)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: `File "${targetRelPath}" already exists.`,
      },
    };
  }

  const newContent = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    '    <loc>https://TODO-SEO.example/</loc>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');

  const diff = generateUnifiedDiff(targetRelPath, '', newContent, true);

  return {
    ok: true,
    proposal: {
      id: `prop_${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      filePath: targetRelPath,
      kind: 'create',
      hunks: diff.hunks,
      diff: diff.diffText,
      manualReviewRequired: true,
      todoMarkers: countTodoMarkers(newContent),
    },
  };
}

// ---------------------------------------------------------------------------
// 3. R-TECH-03: Remove accidental noindex
// ---------------------------------------------------------------------------
function fixNoindex(ctx: FixerContext, finding: Finding): FixResult {
  const filePath = finding.evidence.filePath;
  if (!filePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'No file path found in finding evidence.',
      },
    };
  }

  const safeRes = resolveSafePath(ctx.projectRoot, filePath);
  if (!safeRes.ok || !safeRes.absolutePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'unsafe-path',
        message: safeRes.error ?? 'Unsafe path',
      },
    };
  }

  if (!fs.existsSync(safeRes.absolutePath)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: `File "${filePath}" does not exist.`,
      },
    };
  }

  const content = fs.readFileSync(safeRes.absolutePath, 'utf-8');
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > MAX_DIFF_LINES) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'file-too-large',
        message: `File exceeds maximum line limit of ${MAX_DIFF_LINES}.`,
      },
    };
  }

  const targetLineIdx = (finding.evidence.lineNumber ?? 1) - 1;
  let modifiedLineIdx = -1;

  // Check the cited line or search within a window of +/- 5 lines
  const searchStart = Math.max(0, targetLineIdx - 5);
  const searchEnd = Math.min(lines.length - 1, targetLineIdx + 5);

  for (let i = searchStart; i <= searchEnd; i++) {
    const candidate = lines[i];
    if (candidate && /\bnoindex\b/i.test(candidate)) {
      modifiedLineIdx = i;
      break;
    }
  }

  if (modifiedLineIdx === -1) {
    // If not found in window, check if it's a programmatic Next.js metadata export
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      return {
        ok: false,
        skipped: {
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: 'framework-metadata',
          message: 'No literal "noindex" found on target line in framework metadata.',
        },
      };
    }

    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'Could not find "noindex" directive near the line cited in evidence.',
      },
    };
  }

  const oldLine = lines[modifiedLineIdx] ?? '';
  let newLine: string;

  if (/content=["'][^"']*noindex[^"']*["']/i.test(oldLine)) {
    newLine = oldLine.replace(/noindex/gi, 'index, follow');
  } else if (/index\s*:\s*false/i.test(oldLine)) {
    newLine = oldLine.replace(/index\s*:\s*false/i, 'index: true');
  } else {
    newLine = oldLine.replace(/\bnoindex\b/gi, 'index, follow');
  }

  lines[modifiedLineIdx] = newLine;
  const isCrLf = content.includes('\r\n');
  const newContent = lines.join(isCrLf ? '\r\n' : '\n');

  const diff = generateUnifiedDiff(filePath, content, newContent, false);

  return {
    ok: true,
    proposal: {
      id: `prop_${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      filePath,
      kind: 'modify',
      hunks: diff.hunks,
      diff: diff.diffText,
      manualReviewRequired: false,
      todoMarkers: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// 4. R-TECH-05: Insert canonical URL before </head>
// ---------------------------------------------------------------------------
function fixCanonical(ctx: FixerContext, finding: Finding): FixResult {
  const filePath = finding.evidence.filePath;
  if (!filePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'No file path found in finding evidence.',
      },
    };
  }

  const safeRes = resolveSafePath(ctx.projectRoot, filePath);
  if (!safeRes.ok || !safeRes.absolutePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'unsafe-path',
        message: safeRes.error ?? 'Unsafe path',
      },
    };
  }

  if (!fs.existsSync(safeRes.absolutePath)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: `File "${filePath}" does not exist.`,
      },
    };
  }

  const content = fs.readFileSync(safeRes.absolutePath, 'utf-8');
  if (!content.includes('</head>')) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      return {
        ok: false,
        skipped: {
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: 'framework-metadata',
          message: 'Next.js route file without literal </head> tag.',
        },
      };
    }
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'Could not find closing </head> tag in file.',
      },
    };
  }

  const insertion = '    <link rel="canonical" href="https://TODO-SEO.example/canonical-url">\n  </head>';
  const newContent = content.replace(/<\/head>/, insertion);
  const diff = generateUnifiedDiff(filePath, content, newContent, false);

  return {
    ok: true,
    proposal: {
      id: `prop_${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      filePath,
      kind: 'modify',
      hunks: diff.hunks,
      diff: diff.diffText,
      manualReviewRequired: true,
      todoMarkers: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. R-TECH-14: Add lang attribute to <html>
// ---------------------------------------------------------------------------
function fixHtmlLang(ctx: FixerContext, finding: Finding): FixResult {
  const filePath = finding.evidence.filePath;
  if (!filePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'No file path found in finding evidence.',
      },
    };
  }

  const safeRes = resolveSafePath(ctx.projectRoot, filePath);
  if (!safeRes.ok || !safeRes.absolutePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'unsafe-path',
        message: safeRes.error ?? 'Unsafe path',
      },
    };
  }

  if (!fs.existsSync(safeRes.absolutePath)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: `File "${filePath}" does not exist.`,
      },
    };
  }

  const content = fs.readFileSync(safeRes.absolutePath, 'utf-8');
  if (!/<html(\s|>)/i.test(content)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'Could not find <html> opening tag in file.',
      },
    };
  }

  const lang = ctx.lang ?? 'en';
  let newContent = content;
  if (/<html\s*>/i.test(content)) {
    newContent = content.replace(/<html\s*>/i, `<html lang="${lang}">`);
  } else {
    newContent = content.replace(/<html(\s+[^>]*)>/i, `<html lang="${lang}"$1>`);
  }

  const diff = generateUnifiedDiff(filePath, content, newContent, false);

  return {
    ok: true,
    proposal: {
      id: `prop_${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      filePath,
      kind: 'modify',
      hunks: diff.hunks,
      diff: diff.diffText,
      manualReviewRequired: false,
      todoMarkers: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. R-ONPAGE-01: Insert <title>TODO-SEO</title> before </head>
// ---------------------------------------------------------------------------
function fixTitle(ctx: FixerContext, finding: Finding): FixResult {
  const filePath = finding.evidence.filePath;
  if (!filePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'No file path found in finding evidence.',
      },
    };
  }

  const safeRes = resolveSafePath(ctx.projectRoot, filePath);
  if (!safeRes.ok || !safeRes.absolutePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'unsafe-path',
        message: safeRes.error ?? 'Unsafe path',
      },
    };
  }

  if (!fs.existsSync(safeRes.absolutePath)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: `File "${filePath}" does not exist.`,
      },
    };
  }

  const content = fs.readFileSync(safeRes.absolutePath, 'utf-8');
  if (!content.includes('</head>')) {
    const templatePatched = applyTemplateFix(filePath, content, 'title');
    if (templatePatched !== null) {
      const diff = generateUnifiedDiff(filePath, content, templatePatched, false);
      return {
        ok: true,
        proposal: {
          id: `prop_${finding.id}`,
          findingId: finding.id,
          ruleId: finding.ruleId,
          filePath,
          kind: 'modify',
          hunks: diff.hunks,
          diff: diff.diffText,
          manualReviewRequired: true,
          todoMarkers: 1,
        },
      };
    }

    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      return {
        ok: false,
        skipped: {
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: 'framework-metadata',
          message: 'Next.js route file without literal </head> tag.',
        },
      };
    }
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'Could not find closing </head> tag in file.',
      },
    };
  }

  const insertion = '    <title>TODO-SEO</title>\n  </head>';
  const newContent = content.replace(/<\/head>/, insertion);
  const diff = generateUnifiedDiff(filePath, content, newContent, false);

  return {
    ok: true,
    proposal: {
      id: `prop_${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      filePath,
      kind: 'modify',
      hunks: diff.hunks,
      diff: diff.diffText,
      manualReviewRequired: true,
      todoMarkers: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. R-ONPAGE-04: Insert <meta name="description" content="TODO-SEO"> before </head>
// ---------------------------------------------------------------------------
function fixMetaDescription(ctx: FixerContext, finding: Finding): FixResult {
  const filePath = finding.evidence.filePath;
  if (!filePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'No file path found in finding evidence.',
      },
    };
  }

  const safeRes = resolveSafePath(ctx.projectRoot, filePath);
  if (!safeRes.ok || !safeRes.absolutePath) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'unsafe-path',
        message: safeRes.error ?? 'Unsafe path',
      },
    };
  }

  if (!fs.existsSync(safeRes.absolutePath)) {
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: `File "${filePath}" does not exist.`,
      },
    };
  }

  const content = fs.readFileSync(safeRes.absolutePath, 'utf-8');
  if (!content.includes('</head>')) {
    const templatePatched = applyTemplateFix(filePath, content, 'description');
    if (templatePatched !== null) {
      const diff = generateUnifiedDiff(filePath, content, templatePatched, false);
      return {
        ok: true,
        proposal: {
          id: `prop_${finding.id}`,
          findingId: finding.id,
          ruleId: finding.ruleId,
          filePath,
          kind: 'modify',
          hunks: diff.hunks,
          diff: diff.diffText,
          manualReviewRequired: true,
          todoMarkers: 1,
        },
      };
    }

    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      return {
        ok: false,
        skipped: {
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: 'framework-metadata',
          message: 'Next.js route file without literal </head> tag.',
        },
      };
    }
    return {
      ok: false,
      skipped: {
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: 'context-not-found',
        message: 'Could not find closing </head> tag in file.',
      },
    };
  }

  const insertion = '    <meta name="description" content="TODO-SEO">\n  </head>';
  const newContent = content.replace(/<\/head>/, insertion);
  const diff = generateUnifiedDiff(filePath, content, newContent, false);

  return {
    ok: true,
    proposal: {
      id: `prop_${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      filePath,
      kind: 'modify',
      hunks: diff.hunks,
      diff: diff.diffText,
      manualReviewRequired: true,
      todoMarkers: 1,
    },
  };
}

function applyTemplateFix(
  filePath: string,
  content: string,
  type: 'title' | 'description',
): string | null {
  const isAstro = filePath.endsWith('.astro');
  const isSvelte = filePath.endsWith('.svelte');
  const isVue = filePath.endsWith('.vue');
  const isRemix =
    filePath.includes('app/routes/') && (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'));
  const isDjango =
    filePath.endsWith('.html') && (content.includes('{% extends') || content.includes('{% block'));

  if (isAstro) {
    if (content.startsWith('---')) {
      const secondDash = content.indexOf('---', 3);
      if (secondDash !== -1) {
        const insertion = type === 'title' ? "title: 'TODO-SEO'\n" : "description: 'TODO-SEO'\n";
        return content.slice(0, 3) + '\n' + insertion + content.slice(4);
      }
    }
    const insertion =
      type === 'title' ? "---\ntitle: 'TODO-SEO'\n---\n" : "---\ndescription: 'TODO-SEO'\n---\n";
    return insertion + content;
  }

  if (isSvelte) {
    if (content.includes('<svelte:head>')) {
      const insertion =
        type === 'title'
          ? '  <title>TODO-SEO</title>\n'
          : '  <meta name="description" content="TODO-SEO" />\n';
      return content.replace('<svelte:head>', `<svelte:head>\n${insertion}`);
    }
    const block =
      type === 'title'
        ? '<svelte:head>\n  <title>TODO-SEO</title>\n</svelte:head>\n\n'
        : '<svelte:head>\n  <meta name="description" content="TODO-SEO" />\n</svelte:head>\n\n';
    return block + content;
  }

  if (isVue) {
    if (content.includes('<script setup>')) {
      const insertion =
        type === 'title'
          ? "useSeoMeta({ title: 'TODO-SEO' });\n"
          : "useSeoMeta({ description: 'TODO-SEO' });\n";
      return content.replace('<script setup>', `<script setup>\n${insertion}`);
    }
    const scriptBlock =
      type === 'title'
        ? "<script setup>\nuseSeoMeta({ title: 'TODO-SEO' });\n</script>\n\n"
        : "<script setup>\nuseSeoMeta({ description: 'TODO-SEO' });\n</script>\n\n";
    return scriptBlock + content;
  }

  if (isRemix) {
    if (content.includes('export const meta')) {
      const arrayStart = content.indexOf('[', content.indexOf('export const meta'));
      if (arrayStart !== -1) {
        const item =
          type === 'title'
            ? "{ title: 'TODO-SEO' },\n  "
            : "{ name: 'description', content: 'TODO-SEO' },\n  ";
        return content.slice(0, arrayStart + 1) + '\n  ' + item + content.slice(arrayStart + 1);
      }
    }
    const metaBlock =
      type === 'title'
        ? "export const meta = () => [\n  { title: 'TODO-SEO' },\n];\n\n"
        : "export const meta = () => [\n  { name: 'description', content: 'TODO-SEO' },\n];\n\n";
    return metaBlock + content;
  }

  if (isDjango) {
    const extendsMatch = content.match(/\{%\s*extends\s+[^%]+%\}\r?\n/);
    if (extendsMatch && extendsMatch[0]) {
      const idx = (extendsMatch.index ?? 0) + extendsMatch[0].length;
      const block =
        type === 'title'
          ? '{% block title %}TODO-SEO{% endblock %}\n'
          : '{% block meta %}\n<meta name="description" content="TODO-SEO" />\n{% endblock %}\n';
      return content.slice(0, idx) + block + content.slice(idx);
    }
    const block =
      type === 'title'
        ? '{% block title %}TODO-SEO{% endblock %}\n'
        : '{% block meta %}\n<meta name="description" content="TODO-SEO" />\n{% endblock %}\n';
    return block + content;
  }

  return null;
}
