import { describe, it, expect } from 'vitest';
import { patchPhpNativeTemplate } from '../../../packages/adapters/src/php-native-adapter.js';

describe('PHP Native Adapter (Laragon / Docker)', () => {
  it('enriches native PHP template with $pageTitle and $metaDescription before header include', () => {
    const phpTemplate = `<?php\nrequire_once 'includes/header.php';\n?>\n<h1>Bienvenue</h1>\n`;

    const patched = patchPhpNativeTemplate(phpTemplate, {
      title: 'Titre PHP Natif',
      description: 'Description pour application PHP native ou Laragon.',
    });

    expect(patched).toContain("$pageTitle = 'Titre PHP Natif';");
    expect(patched).toContain("$metaDescription = 'Description pour application PHP native ou Laragon.';");
    expect(patched.indexOf('$pageTitle')).toBeLessThan(patched.indexOf("require_once 'includes/header.php'"));
  });

  it('preserves existing $pageTitle assignment if present', () => {
    const existing = `<?php\n$pageTitle = 'Mon Titre Initial';\nrequire_once 'header.php';\n?>`;

    const patched = patchPhpNativeTemplate(existing, {
      title: 'Nouveau Titre',
      description: 'Desc',
    });

    expect(patched).toContain("$pageTitle = 'Mon Titre Initial';");
    expect(patched).not.toContain("$pageTitle = 'Nouveau Titre';");
  });
});

