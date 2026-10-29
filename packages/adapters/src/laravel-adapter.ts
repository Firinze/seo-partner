export interface LaravelMetaFields {
  title?: string;
  description?: string;
  canonical?: string;
}

export function patchLaravelBladeTemplate(
  sourceCode: string,
  meta: LaravelMetaFields,
): string {
  let result = sourceCode;

  // Title section
  if (meta.title && !/@section\(\s*['"]title['"]/i.test(result)) {
    const sectionTitle = `@section('title', '${meta.title.replace(/'/g, "\\'")}')\n`;
    if (/@extends\([^)]+\)/i.test(result)) {
      result = result.replace(/(@extends\([^)]+\)\s*\n)/i, `$1${sectionTitle}`);
    } else {
      result = sectionTitle + result;
    }
  }

  // Meta push
  if ((meta.description || meta.canonical) && !/@push\(\s*['"]meta['"]/i.test(result)) {
    const metaTags: string[] = ["@push('meta')"];
    if (meta.description) {
      metaTags.push(`  <meta name="description" content="${meta.description.replace(/"/g, '&quot;')}">`);
    }
    if (meta.canonical) {
      metaTags.push(`  <link rel="canonical" href="${meta.canonical}">`);
    }
    metaTags.push('@endpush\n');

    if (/@section\(\s*['"]title['"][^)]*\)/i.test(result)) {
      result = result.replace(/(@section\(\s*['"]title['"][^)]*\)\s*\n)/i, `$1${metaTags.join('\n')}`);
    } else if (/@extends\([^)]+\)/i.test(result)) {
      result = result.replace(/(@extends\([^)]+\)\s*\n)/i, `$1${metaTags.join('\n')}`);
    } else {
      result = metaTags.join('\n') + result;
    }
  }

  return result;
}

