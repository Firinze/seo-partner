export interface LayoutTitleTemplate {
  template?: string;
  defaultTitle?: string;
  brandName?: string;
}

export function extractLayoutTitleTemplate(layoutCode: string): LayoutTitleTemplate | null {
  const match = /title\s*:\s*\{([^}]+)\}/m.exec(layoutCode);
  if (!match || !match[1]) return null;

  const body = match[1];
  const templateMatch = /template\s*:\s*['"`]([^'"`]+)['"`]/.exec(body);
  const defaultMatch = /default\s*:\s*['"`]([^'"`]+)['"`]/.exec(body);

  const template = templateMatch?.[1];
  const defaultTitle = defaultMatch?.[1];

  let brandName: string | undefined;
  if (template && template.includes('%s')) {
    brandName = template.replace('%s', '').replace(/^[| -]+|[| -]+$/g, '').trim();
  }

  return {
    template,
    defaultTitle,
    brandName,
  };
}

export function sanitizePageTitleForLayout(pageTitle: string, layoutTemplate: LayoutTitleTemplate | null): string {
  if (!layoutTemplate?.brandName) {
    return pageTitle;
  }
  const brand = layoutTemplate.brandName;
  const regex = new RegExp(`(\\s*[|\\-]\\s*${brand.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})+$`, 'i');
  return pageTitle.replace(regex, '').trim();
}
