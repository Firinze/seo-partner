import { normalizeRoutePattern } from './route-normalizer.js';

export interface DjangoDiscoveredPattern {
  readonly pattern: string;
  readonly rawPattern: string;
  readonly viewName: string;
  readonly lineNumber: number;
}

export interface DjangoViewTemplateMapping {
  readonly viewName: string;
  readonly templateName: string;
}

function lineNumberAtOffset(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/**
 * Statically parses a Django urls.py file to extract route declarations without executing Python.
 */
export function parseDjangoUrls(urlsPyContent: string): ReadonlyArray<DjangoDiscoveredPattern> {
  const routes: DjangoDiscoveredPattern[] = [];

  // Match path('pattern', view, ...) or re_path(r'pattern', view, ...)
  const pathRegex = /(?:path|re_path)\s*\(\s*(?:r?['"]([^'"]*)['"])\s*,\s*([a-zA-Z0-9_.]+(?:\.as_view\(\))?)/g;
  let match: RegExpExecArray | null;

  while ((match = pathRegex.exec(urlsPyContent)) !== null) {
    const rawPattern = match[1] ?? '';
    const rawView = match[2] ?? '';
    const line = lineNumberAtOffset(urlsPyContent, match.index);

    // Clean view identifier (e.g. views.home_view -> home_view, views.ShopView.as_view() -> ShopView)
    let viewName = rawView.replace(/\.as_view\(\)$/, '');
    if (viewName.includes('.')) {
      viewName = viewName.split('.').pop() ?? viewName;
    }

    const pattern = normalizeRoutePattern(rawPattern, 'django');

    routes.push({
      pattern,
      rawPattern,
      viewName,
      lineNumber: line,
    });
  }

  return routes;
}

/**
 * Statically parses a Django views.py file to extract view -> template_name mappings.
 */
export function parseDjangoViews(viewsPyContent: string): ReadonlyArray<DjangoViewTemplateMapping> {
  const mappings: DjangoViewTemplateMapping[] = [];

  // 1. Function-based views: def view_name(request, ...): ... render(request, 'template.html', ...)
  const funcRegex = /def\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:([\s\S]*?)(?=\ndef|\nclass|$)/g;
  let funcMatch: RegExpExecArray | null;
  while ((funcMatch = funcRegex.exec(viewsPyContent)) !== null) {
    const viewName = funcMatch[1] ?? '';
    const body = funcMatch[2] ?? '';
    const renderMatch = /render\s*\(\s*[^,]+,\s*['"]([^'"]+\.html)['"]/i.exec(body);
    if (renderMatch && renderMatch[1]) {
      mappings.push({
        viewName,
        templateName: renderMatch[1],
      });
    }
  }

  // 2. Class-based views: class ViewName(...): ... template_name = 'template.html'
  const classRegex = /class\s+([a-zA-Z0-9_]+)\b[\s\S]*?template_name\s*=\s*['"]([^'"]+\.html)['"]/g;
  let classMatch: RegExpExecArray | null;
  while ((classMatch = classRegex.exec(viewsPyContent)) !== null) {
    const viewName = classMatch[1] ?? '';
    const tpl = classMatch[2] ?? '';
    mappings.push({
      viewName,
      templateName: tpl,
    });
  }

  return mappings;
}

