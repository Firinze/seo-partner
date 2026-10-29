import { describe, it, expect } from 'vitest';
import { patchSymfonyTwigTemplate } from '../../../packages/adapters/src/symfony-adapter.js';

describe('Symfony Twig Adapter', () => {
  it('enriches Twig template with {% block title %} and meta tags', () => {
    const twig = `{% extends 'base.html.twig' %}\n\n{% block body %}\n  <h1>Tableau de bord</h1>\n{% endblock %}\n`;

    const patched = patchSymfonyTwigTemplate(twig, {
      title: 'Accueil Sécurisé - Symfony',
      description: 'Solution experte pour optimiser le SEO sur Symfony Twig.',
      canonical: 'https://example.com/symfony',
    });

    expect(patched).toContain("{% block title %}Accueil Sécurisé - Symfony{% endblock %}");
    expect(patched).toContain("<meta name=\"description\" content=\"Solution experte pour optimiser le SEO sur Symfony Twig.\">");
  });

  it('preserves existing {% block title %}', () => {
    const existing = `{% extends 'base.html.twig' %}\n{% block title %}Mon Titre{% endblock %}\n{% block body %}Hello{% endblock %}`;

    const patched = patchSymfonyTwigTemplate(existing, {
      title: 'Autre Titre',
      description: 'Desc',
    });

    expect(patched).toContain("{% block title %}Mon Titre{% endblock %}");
    expect(patched).not.toContain("{% block title %}Autre Titre{% endblock %}");
  });
});

