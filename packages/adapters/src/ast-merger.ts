export interface MetadataFields {
  title?: string;
  description?: string;
  canonical?: string;
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
  };
}

export interface AstMergeResult {
  mergedCode: string;
  modified: boolean;
  hasComplexDynamicLogic: boolean;
  isClientComponent: boolean;
  changes: Array<{
    field: string;
    before?: string | null;
    after: string;
  }>;
}

export function mergePageMetadataInPlace(
  sourceCode: string,
  newMeta: MetadataFields,
): AstMergeResult {
  const isClientComponent = /^\s*['"]use client['"]/m.test(sourceCode);
  const hasGenerateMetadata = /\bexport\s+(async\s+)?function\s+generateMetadata\b/.test(sourceCode);

  if (hasGenerateMetadata) {
    return {
      mergedCode: sourceCode,
      modified: false,
      hasComplexDynamicLogic: true,
      isClientComponent,
      changes: [],
    };
  }

  const changes: Array<{ field: string; before?: string | null; after: string }> = [];

  // Match existing `export const metadata = { ... }` or `export const metadata: Metadata = { ... }`
  const metadataRegex = /(export\s+const\s+metadata(?:\s*:\s*\w+)?\s*=\s*\{)([\s\S]*?)(\};?)/m;
  const match = metadataRegex.exec(sourceCode);

  if (match) {
    const prefix = match[1] ?? '';
    let body = match[2] ?? '';
    const suffix = match[3] ?? '';

    // Check title
    if (newMeta.title && !/\btitle\s*:/m.test(body)) {
      const val = newMeta.title;
      body = `\n  title: '${val.replace(/'/g, "\\'")}',` + body;
      changes.push({ field: 'title', before: null, after: val });
    }

    // Check description
    if (newMeta.description && !/\bdescription\s*:/m.test(body)) {
      const val = newMeta.description;
      body = `\n  description: '${val.replace(/'/g, "\\'")}',` + body;
      changes.push({ field: 'description', before: null, after: val });
    }

    // Check alternates / canonical
    if (newMeta.canonical && !/\balternates\s*:/m.test(body)) {
      const val = newMeta.canonical;
      body = body + `\n  alternates: {\n    canonical: '${val}',\n  },`;
      changes.push({ field: 'alternates.canonical', before: null, after: val });
    }

    // Check openGraph
    if (newMeta.openGraph && !/\bopenGraph\s*:/m.test(body)) {
      const ogTitle = newMeta.openGraph.title ?? newMeta.title ?? '';
      const ogDesc = newMeta.openGraph.description ?? newMeta.description ?? '';
      body = body + `\n  openGraph: {\n    title: '${ogTitle.replace(/'/g, "\\'")}',\n    description: '${ogDesc.replace(/'/g, "\\'")}',\n  },`;
      changes.push({ field: 'openGraph', before: null, after: ogTitle });
    }

    const mergedCode = sourceCode.replace(metadataRegex, `${prefix}${body}\n${suffix}`);
    return {
      mergedCode,
      modified: changes.length > 0,
      hasComplexDynamicLogic: false,
      isClientComponent,
      changes,
    };
  }

  // No existing metadata block: create one
  const entries: string[] = [];
  if (newMeta.title) {
    entries.push(`  title: '${newMeta.title.replace(/'/g, "\\'")}',`);
    changes.push({ field: 'title', before: null, after: newMeta.title });
  }
  if (newMeta.description) {
    entries.push(`  description: '${newMeta.description.replace(/'/g, "\\'")}',`);
    changes.push({ field: 'description', before: null, after: newMeta.description });
  }
  if (newMeta.canonical) {
    entries.push(`  alternates: {\n    canonical: '${newMeta.canonical}',\n  },`);
    changes.push({ field: 'alternates.canonical', before: null, after: newMeta.canonical });
  }
  if (newMeta.openGraph) {
    const ogTitle = newMeta.openGraph.title ?? newMeta.title ?? '';
    const ogDesc = newMeta.openGraph.description ?? newMeta.description ?? '';
    entries.push(`  openGraph: {\n    title: '${ogTitle.replace(/'/g, "\\'")}',\n    description: '${ogDesc.replace(/'/g, "\\'")}',\n  },`);
    changes.push({ field: 'openGraph', before: null, after: ogTitle });
  }

  const newExport = `\nexport const metadata = {\n${entries.join('\n')}\n};\n`;
  const mergedCode = sourceCode + newExport;

  return {
    mergedCode,
    modified: true,
    hasComplexDynamicLogic: false,
    isClientComponent,
    changes,
  };
}
