import ts from 'typescript';
import type {
  DiscoveredRoute,
  ExtractedRouteData,
  HeadingItem,
  ImageItem,
  JsonLdItem,
  LinkItem,
  RenderingMode,
} from '@seo-partner/core';

export function detectRenderingModeFromTsx(sourceText: string): RenderingMode {
  const trimmed = sourceText.trimStart();
  if (trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"')) {
    return 'client-only';
  }
  if (/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(sourceText)) {
    return 'dynamic';
  }
  return 'ssr-ssg';
}

function getLineNumber(sourceFile: ts.SourceFile, pos: number): number {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

function extractStringLiteral(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function extractJsxText(node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment): string {
  if (ts.isJsxSelfClosingElement(node)) return '';
  const parts: string[] = [];
  for (const child of node.children) {
    if (ts.isJsxText(child)) {
      const cleaned = child.getText().replace(/\s+/g, ' ').trim();
      if (cleaned) parts.push(cleaned);
    } else if (ts.isJsxExpression(child) && child.expression) {
      const lit = extractStringLiteral(child.expression);
      if (lit) parts.push(lit);
    } else if (ts.isJsxElement(child) || ts.isJsxFragment(child)) {
      const nested = extractJsxText(child);
      if (nested) parts.push(nested);
    }
  }
  return parts.join(' ').trim();
}

function validateJsonLdObject(
  rawJson: string,
  line: number,
): JsonLdItem {
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    const contextVal = parsed['@context'];
    const typeVal = parsed['@type'];
    const hasValidContext =
      typeof contextVal === 'string' && contextVal.includes('schema.org');
    const hasValidType =
      typeof typeVal === 'string' && typeVal.trim().length > 0;

    if (!hasValidContext) {
      return {
        schemaType: typeof typeVal === 'string' ? typeVal : null,
        rawJson,
        isValid: false,
        validationError: 'Missing or invalid @context (expected https://schema.org)',
        line,
      };
    }
    if (!hasValidType) {
      return {
        schemaType: null,
        rawJson,
        isValid: false,
        validationError: 'Missing required @type property in JSON-LD object',
        line,
      };
    }
    return {
      schemaType: typeVal,
      rawJson,
      isValid: true,
      validationError: null,
      line,
    };
  } catch (err) {
    return {
      schemaType: null,
      rawJson,
      isValid: false,
      validationError: err instanceof Error ? err.message : 'Invalid JSON syntax',
      line,
    };
  }
}

function objectLiteralToPlainObject(
  obj: ts.ObjectLiteralExpression,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const key = ts.isIdentifier(prop.name)
        ? prop.name.text
        : extractStringLiteral(prop.name) ?? prop.name.getText();
      const val = prop.initializer;
      const strVal = extractStringLiteral(val);
      if (strVal !== null) {
        result[key] = strVal;
      } else if (val.kind === ts.SyntaxKind.TrueKeyword) {
        result[key] = true;
      } else if (val.kind === ts.SyntaxKind.FalseKeyword) {
        result[key] = false;
      } else if (ts.isNumericLiteral(val)) {
        result[key] = Number(val.text);
      } else if (ts.isObjectLiteralExpression(val)) {
        result[key] = objectLiteralToPlainObject(val);
      }
    }
  }
  return result;
}

export function parseTsxRouteFile(
  route: DiscoveredRoute,
  fileContent: string,
): ExtractedRouteData {
  const sourceFile = ts.createSourceFile(
    route.filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  let title: { value: string; line: number } | null = null;
  let description: { value: string; line: number } | null = null;
  let canonical: { value: string; line: number } | null = null;
  let robots: { value: string; line: number } | null = null;
  const openGraph: Record<string, string> = {};
  const hreflang: Array<{ lang: string; url: string }> = [];
  const headings: HeadingItem[] = [];
  const images: ImageItem[] = [];
  const links: LinkItem[] = [];
  const jsonLdItems: JsonLdItem[] = [];

  const varObjectMap = new Map<string, { obj: Record<string, unknown>; line: number }>();

  function inspectMetadataObject(obj: ts.ObjectLiteralExpression): void {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const propName = ts.isIdentifier(prop.name)
        ? prop.name.text
        : extractStringLiteral(prop.name) ?? '';
      const line = getLineNumber(sourceFile, prop.getStart(sourceFile));

      if (propName === 'title') {
        const str = extractStringLiteral(prop.initializer);
        if (str !== null) {
          title = { value: str, line };
        } else if (ts.isObjectLiteralExpression(prop.initializer)) {
          const plain = objectLiteralToPlainObject(prop.initializer);
          if (typeof plain['default'] === 'string') {
            title = { value: plain['default'], line };
          }
        }
      } else if (propName === 'description') {
        const str = extractStringLiteral(prop.initializer);
        if (str !== null) {
          description = { value: str, line };
        }
      } else if (propName === 'alternates' && ts.isObjectLiteralExpression(prop.initializer)) {
        for (const altProp of prop.initializer.properties) {
          if (!ts.isPropertyAssignment(altProp)) continue;
          const altName = ts.isIdentifier(altProp.name) ? altProp.name.text : '';
          const altLine = getLineNumber(sourceFile, altProp.getStart(sourceFile));
          if (altName === 'canonical') {
            const cStr = extractStringLiteral(altProp.initializer);
            if (cStr !== null) canonical = { value: cStr, line: altLine };
          } else if (
            altName === 'languages' &&
            ts.isObjectLiteralExpression(altProp.initializer)
          ) {
            const langs = objectLiteralToPlainObject(altProp.initializer);
            for (const [k, v] of Object.entries(langs)) {
              if (typeof v === 'string') hreflang.push({ lang: k, url: v });
            }
          }
        }
      } else if (propName === 'robots') {
        const str = extractStringLiteral(prop.initializer);
        if (str !== null) {
          robots = { value: str, line };
        } else if (ts.isObjectLiteralExpression(prop.initializer)) {
          const plain = objectLiteralToPlainObject(prop.initializer);
          const parts: string[] = [];
          if (plain['index'] === false) parts.push('noindex');
          if (plain['index'] === true) parts.push('index');
          if (plain['follow'] === false) parts.push('nofollow');
          if (plain['follow'] === true) parts.push('follow');
          robots = { value: parts.join(', ') || JSON.stringify(plain), line };
        }
      } else if (propName === 'openGraph' && ts.isObjectLiteralExpression(prop.initializer)) {
        const plain = objectLiteralToPlainObject(prop.initializer);
        for (const [k, v] of Object.entries(plain)) {
          if (typeof v === 'string') openGraph[k] = v;
        }
      }
    }
  }

  function getJsxAttributeMap(
    attrs: ts.JsxAttributes,
  ): Map<string, { value: string | null; expr: ts.Expression | null; line: number }> {
    const map = new Map<
      string,
      { value: string | null; expr: ts.Expression | null; line: number }
    >();
    for (const prop of attrs.properties) {
      if (ts.isJsxAttribute(prop)) {
        const name = prop.name.getText(sourceFile);
        const line = getLineNumber(sourceFile, prop.getStart(sourceFile));
        if (!prop.initializer) {
          map.set(name, { value: '', expr: null, line });
        } else if (ts.isStringLiteral(prop.initializer)) {
          map.set(name, { value: prop.initializer.text, expr: null, line });
        } else if (
          ts.isJsxExpression(prop.initializer) &&
          prop.initializer.expression
        ) {
          const lit = extractStringLiteral(prop.initializer.expression);
          map.set(name, {
            value: lit,
            expr: prop.initializer.expression,
            line,
          });
        }
      }
    }
    return map;
  }

  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const varName = node.name.text;
      if (ts.isObjectLiteralExpression(node.initializer)) {
        if (varName === 'metadata') {
          inspectMetadataObject(node.initializer);
        } else {
          varObjectMap.set(varName, {
            obj: objectLiteralToPlainObject(node.initializer),
            line: getLineNumber(sourceFile, node.getStart(sourceFile)),
          });
        }
      }
    }

    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'generateMetadata' &&
      node.body
    ) {
      node.body.forEachChild(function walkBody(child) {
        if (ts.isReturnStatement(child) && child.expression && ts.isObjectLiteralExpression(child.expression)) {
          inspectMetadataObject(child.expression);
        }
        child.forEachChild(walkBody);
      });
    }

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tagName = opening.tagName.getText(sourceFile);
      const line = getLineNumber(sourceFile, opening.getStart(sourceFile));
      const attrs = getJsxAttributeMap(opening.attributes);

      if (/^h[1-6]$/i.test(tagName)) {
        const level = Number(tagName.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
        const text = extractJsxText(node);
        headings.push({ level, text, line });
      } else if (tagName === 'title' && ts.isJsxElement(node)) {
        const text = extractJsxText(node);
        if (text && !title) {
          title = { value: text, line };
        }
      } else if (tagName === 'meta') {
        const nameAttr = attrs.get('name')?.value?.toLowerCase();
        const propAttr = attrs.get('property')?.value?.toLowerCase();
        const contentAttr = attrs.get('content')?.value ?? null;
        if (nameAttr === 'description' && contentAttr !== null && !description) {
          description = { value: contentAttr, line };
        } else if (nameAttr === 'robots' && contentAttr !== null && !robots) {
          robots = { value: contentAttr, line };
        } else if (propAttr?.startsWith('og:') && contentAttr !== null) {
          openGraph[propAttr.slice(3)] = contentAttr;
        }
      } else if (tagName === 'link') {
        const relAttr = attrs.get('rel')?.value?.toLowerCase();
        const hrefAttr = attrs.get('href')?.value ?? null;
        if (relAttr === 'canonical' && hrefAttr !== null && !canonical) {
          canonical = { value: hrefAttr, line };
        } else if (relAttr === 'alternate' && hrefAttr !== null) {
          const hrefLangVal = attrs.get('hrefLang')?.value ?? attrs.get('hreflang')?.value;
          if (hrefLangVal) {
            hreflang.push({ lang: hrefLangVal, url: hrefAttr });
          }
        }
      } else if (tagName === 'img' || tagName === 'Image') {
        const srcVal = attrs.get('src')?.value ?? '';
        const altEntry = attrs.get('alt');
        const hasAlt = altEntry !== undefined && altEntry.value !== null && altEntry.value.trim().length > 0;
        images.push({
          src: srcVal,
          alt: altEntry?.value ?? null,
          hasAlt,
          width: attrs.get('width')?.value ?? null,
          height: attrs.get('height')?.value ?? null,
          line,
        });
      } else if (tagName === 'a' || tagName === 'Link') {
        const hrefVal = attrs.get('href')?.value;
        if (hrefVal) {
          const isExternal = /^https?:\/\//i.test(hrefVal);
          links.push({
            toUrl: hrefVal,
            anchorText: extractJsxText(node),
            kind: isExternal ? 'external' : 'internal',
            rel: attrs.get('rel')?.value ?? null,
            line,
          });
        }
      } else if (tagName === 'script') {
        const typeVal = attrs.get('type')?.value;
        if (typeVal === 'application/ld+json') {
          const dangerAttr = attrs.get('dangerouslySetInnerHTML');
          if (dangerAttr?.expr && ts.isObjectLiteralExpression(dangerAttr.expr)) {
            for (const p of dangerAttr.expr.properties) {
              if (
                ts.isPropertyAssignment(p) &&
                p.name.getText(sourceFile) === '__html'
              ) {
                const strLit = extractStringLiteral(p.initializer);
                if (strLit !== null) {
                  jsonLdItems.push(validateJsonLdObject(strLit, line));
                } else if (
                  ts.isCallExpression(p.initializer) &&
                  p.initializer.expression.getText(sourceFile) === 'JSON.stringify' &&
                  p.initializer.arguments.length > 0
                ) {
                  const arg0 = p.initializer.arguments[0]!;
                  if (ts.isObjectLiteralExpression(arg0)) {
                    const plain = objectLiteralToPlainObject(arg0);
                    jsonLdItems.push(
                      validateJsonLdObject(JSON.stringify(plain), line),
                    );
                  } else if (ts.isIdentifier(arg0)) {
                    const resolved = varObjectMap.get(arg0.text);
                    if (resolved) {
                      jsonLdItems.push(
                        validateJsonLdObject(
                          JSON.stringify(resolved.obj),
                          resolved.line,
                        ),
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

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

