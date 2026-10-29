export interface SymfonyMetaFields {
  title?: string;
  description?: string;
  canonical?: string;
}

export function patchSymfonyTwigTemplate(
  sourceCode: string,
  meta: SymfonyMetaFields,
): string {
  let result = sourceCode;

  if (meta.title && !/{%\s*block\s+title\s*%}/i.test(result)) {
    const titleBlock = `{% block title %}${meta.title}{% endblock %}\n`;
    if (/{%\s*extends[^%]+%}/i.test(result)) {
      result = result.replace(/({%\s*extends[^%]+%}\s*\n)/i, `$1${titleBlock}`);
    } else {
      result = titleBlock + result;
    }
  }

  if (meta.description && !/<meta\s+name=["']description["']/i.test(result)) {
    const descTag = `<meta name="description" content="${meta.description.replace(/"/g, '&quot;')}">\n`;
    if (/{%\s*block\s+title\s*%}[\s\S]*?{%\s*endblock\s*%}/i.test(result)) {
      result = result.replace(/({%\s*block\s+title\s*%}[\s\S]*?{%\s*endblock\s*%}\s*\n)/i, `$1${descTag}`);
    } else {
      result = descTag + result;
    }
  }

  return result;
}

