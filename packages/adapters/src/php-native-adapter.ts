export interface PhpNativeMetaFields {
  title?: string;
  description?: string;
  canonical?: string;
}

export function patchPhpNativeTemplate(
  sourceCode: string,
  meta: PhpNativeMetaFields,
): string {
  let result = sourceCode;

  const vars: string[] = [];
  if (meta.title && !/\$pageTitle\s*=/i.test(result)) {
    vars.push(`$pageTitle = '${meta.title.replace(/'/g, "\\'")}';`);
  }
  if (meta.description && !/\$metaDescription\s*=/i.test(result)) {
    vars.push(`$metaDescription = '${meta.description.replace(/'/g, "\\'")}';`);
  }
  if (meta.canonical && !/\$canonicalUrl\s*=/i.test(result)) {
    vars.push(`$canonicalUrl = '${meta.canonical.replace(/'/g, "\\'")}';`);
  }

  if (vars.length === 0) {
    return result;
  }

  const varsBlock = vars.join('\n') + '\n';

  // If file starts with <?php, inject before any header include
  if (/<\?php/i.test(result)) {
    if (/(include|require|include_once|require_once)\s*['"][^'"]*header[^'"]*['"]/i.test(result)) {
      result = result.replace(
        /((?:include|require|include_once|require_once)\s*['"][^'"]*header[^'"]*['"])/i,
        `${varsBlock}$1`,
      );
    } else {
      result = result.replace(/(<\?php\s*\n)/i, `$1${varsBlock}`);
    }
  } else {
    result = `<?php\n${varsBlock}?>\n` + result;
  }

  return result;
}

