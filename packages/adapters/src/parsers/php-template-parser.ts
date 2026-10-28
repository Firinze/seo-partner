import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import { parseStaticHtmlOrMarkdown } from './html-parser.js';

function lineNumberAtOffset(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function readProjectFileSafe(projectRoot: string, relOrAbsPath: string): string | null {
  try {
    const full = path.isAbsolute(relOrAbsPath)
      ? relOrAbsPath
      : path.join(projectRoot, relOrAbsPath);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return fs.readFileSync(full, 'utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

function extractBladeMetadata(
  projectRoot: string,
  route: DiscoveredRoute,
  fileContent: string,
): ExtractedRouteData {
  const base = parseStaticHtmlOrMarkdown(
    { ...route, routerKind: 'static-html' },
    fileContent,
  );

  let title = base.title;
  let description = base.description;
  let canonical = base.canonical;
  let robots = base.robots;
  let htmlLang = base.htmlLang;

  // 1. Check @section('title', '...') or @section('title')...@endsection
  const inlineTitleMatch =
    /@section\s*\(\s*['"]title['"]\s*,\s*['"]([^'"]*)['"]\s*\)/i.exec(fileContent);
  if (inlineTitleMatch) {
    title = {
      value: (inlineTitleMatch[1] ?? '').trim(),
      line: lineNumberAtOffset(fileContent, inlineTitleMatch.index),
    };
  } else {
    const blockTitleMatch =
      /@section\s*\(\s*['"]title['"]\s*\)([\s\S]*?)@(?:endsection|stop)/i.exec(
        fileContent,
      );
    if (blockTitleMatch) {
      title = {
        value: (blockTitleMatch[1] ?? '').replace(/<[^>]+>/g, '').trim(),
        line: lineNumberAtOffset(fileContent, blockTitleMatch.index),
      };
    }
  }

  // 2. Check @section('description', '...')
  const inlineDescMatch =
    /@section\s*\(\s*['"](?:description|meta_description)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/i.exec(
      fileContent,
    );
  if (inlineDescMatch) {
    description = {
      value: (inlineDescMatch[1] ?? '').trim(),
      line: lineNumberAtOffset(fileContent, inlineDescMatch.index),
    };
  }

  // 3. Resolve @extends('layouts.app')
  const extendsMatch = /@extends\s*\(\s*['"]([^'"]+)['"]\s*\)/i.exec(fileContent);
  if (extendsMatch?.[1]) {
    const layoutRel = `resources/views/${extendsMatch[1].replace(/\./g, '/')}.blade.php`;
    const layoutContent = readProjectFileSafe(projectRoot, layoutRel);
    if (layoutContent) {
      const layoutParsed = parseStaticHtmlOrMarkdown(
        { ...route, filePath: layoutRel, routerKind: 'static-html' },
        layoutContent,
      );
      if (htmlLang === undefined && layoutParsed.htmlLang !== undefined) {
        htmlLang = layoutParsed.htmlLang;
      }
      if (!title) {
        const yieldTitleDefault =
          /@yield\s*\(\s*['"]title['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i.exec(
            layoutContent,
          );
        if (yieldTitleDefault?.[1]) {
          title = {
            value: yieldTitleDefault[1].trim(),
            line: lineNumberAtOffset(layoutContent, yieldTitleDefault.index),
          };
        } else if (
          layoutParsed.title &&
          !layoutParsed.title.value.includes('@yield')
        ) {
          title = layoutParsed.title;
        }
      }
      if (!description) {
        const yieldDescDefault =
          /@yield\s*\(\s*['"]description['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i.exec(
            layoutContent,
          );
        if (yieldDescDefault?.[1] && yieldDescDefault[1].trim().length > 0) {
          description = {
            value: yieldDescDefault[1].trim(),
            line: lineNumberAtOffset(layoutContent, yieldDescDefault.index),
          };
        } else if (
          layoutParsed.description &&
          !layoutParsed.description.value.includes('@yield') &&
          layoutParsed.description.value.trim().length > 0
        ) {
          description = layoutParsed.description;
        }
      }
      if (!canonical && layoutParsed.canonical) {
        canonical = layoutParsed.canonical;
      }
      if (!robots && layoutParsed.robots) {
        robots = layoutParsed.robots;
      }
    }
  }

  return {
    ...base,
    route,
    title,
    description,
    canonical,
    robots,
    ...(htmlLang !== undefined ? { htmlLang } : {}),
  };
}

function extractTwigMetadata(
  projectRoot: string,
  route: DiscoveredRoute,
  fileContent: string,
): ExtractedRouteData {
  const base = parseStaticHtmlOrMarkdown(
    { ...route, routerKind: 'static-html' },
    fileContent,
  );

  let title = base.title;
  let description = base.description;
  let canonical = base.canonical;
  let robots = base.robots;
  let htmlLang = base.htmlLang;

  // 1. Check {% block title %}...{% endblock %}
  const blockTitleMatch =
    /\{%\s*block\s+title\s*%\}[\s\S]*?\{%\s*endblock(?:\s+title)?\s*%\}/i.exec(
      fileContent,
    );
  if (blockTitleMatch) {
    const inner = blockTitleMatch[0]
      .replace(/^\{%\s*block\s+title\s*%\}/i, '')
      .replace(/\{%\s*endblock(?:\s+title)?\s*%\}$/i, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (inner) {
      title = {
        value: inner,
        line: lineNumberAtOffset(fileContent, blockTitleMatch.index),
      };
    }
  }

  // 2. Resolve {% extends 'base.html.twig' %}
  const extendsMatch = /\{%\s*extends\s+['"]([^'"]+)['"]\s*%\}/i.exec(fileContent);
  if (extendsMatch?.[1]) {
    const parentRel = `templates/${extendsMatch[1].replace(/^\/+/, '')}`;
    const parentContent = readProjectFileSafe(projectRoot, parentRel);
    if (parentContent) {
      const parentParsed = parseStaticHtmlOrMarkdown(
        { ...route, filePath: parentRel, routerKind: 'static-html' },
        parentContent,
      );
      if (htmlLang === undefined && parentParsed.htmlLang !== undefined) {
        htmlLang = parentParsed.htmlLang;
      }
      if (!title && parentParsed.title) {
        const cleanedParentTitle = parentParsed.title.value
          .replace(/\{%\s*block\s+title\s*%\}/i, '')
          .replace(/\{%\s*endblock(?:\s+title)?\s*%\}/i, '')
          .trim();
        if (cleanedParentTitle) {
          title = {
            value: cleanedParentTitle,
            line: parentParsed.title.line,
          };
        }
      }
      if (!description && parentParsed.description) {
        description = parentParsed.description;
      }
      if (!canonical && parentParsed.canonical) {
        canonical = parentParsed.canonical;
      }
    }
  }

  return {
    ...base,
    route,
    title,
    description,
    canonical,
    robots,
    ...(htmlLang !== undefined ? { htmlLang } : {}),
  };
}

function extractNativePhpMetadata(
  projectRoot: string,
  route: DiscoveredRoute,
  fileContent: string,
): ExtractedRouteData {
  const base = parseStaticHtmlOrMarkdown(
    { ...route, routerKind: 'static-html' },
    fileContent,
  );

  let title = base.title;
  let description = base.description;
  let canonical = base.canonical;
  let robots = base.robots;
  let htmlLang = base.htmlLang;

  // Check for PHP include/require of a header file (e.g. require_once __DIR__ . '/../includes/header.php';)
  const includeRegex =
    /\b(?:include|include_once|require|require_once)\b[^;]*?['"]([^'"]+\.php)['"]/gi;
  let m: RegExpExecArray | null;
  const currentFileDir = path.dirname(path.join(projectRoot, route.filePath));

  while ((m = includeRegex.exec(fileContent)) !== null) {
    const rawInc = (m[1] ?? '').replace(/^\/+/, '');
    const candidateRelToDir = path.resolve(currentFileDir, rawInc);
    const candidateRelToRoot = path.resolve(projectRoot, rawInc);

    const incContent =
      readProjectFileSafe(projectRoot, candidateRelToDir) ??
      readProjectFileSafe(projectRoot, candidateRelToRoot);

    if (incContent) {
      const incParsed = parseStaticHtmlOrMarkdown(
        { ...route, routerKind: 'static-html' },
        incContent,
      );
      if (htmlLang === undefined && incParsed.htmlLang !== undefined) {
        htmlLang = incParsed.htmlLang;
      }
      if (!title && incParsed.title) {
        title = incParsed.title;
      }
      if (!description && incParsed.description) {
        description = incParsed.description;
      }
      if (!canonical && incParsed.canonical) {
        canonical = incParsed.canonical;
      }
      if (!robots && incParsed.robots) {
        robots = incParsed.robots;
      }
    }
  }

  return {
    ...base,
    route,
    title,
    description,
    canonical,
    robots,
    ...(htmlLang !== undefined ? { htmlLang } : {}),
  };
}

export function parsePhpOrTemplateFile(
  projectRoot: string,
  route: DiscoveredRoute,
  fileContent: string,
): ExtractedRouteData {
  if (route.filePath.endsWith('.blade.php') || route.routerKind === 'laravel') {
    return extractBladeMetadata(projectRoot, route, fileContent);
  }
  if (route.filePath.endsWith('.html.twig') || route.routerKind === 'symfony') {
    return extractTwigMetadata(projectRoot, route, fileContent);
  }
  return extractNativePhpMetadata(projectRoot, route, fileContent);
}

