import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DjangoAdapter } from '../../packages/adapters/src/django-adapter.js';
import { parseDjangoUrls, parseDjangoViews } from '../../packages/adapters/src/parsers/python-url-parser.js';
import { parseDjangoTemplate } from '../../packages/adapters/src/parsers/dtl-parser.js';

describe('DjangoAdapter Conformance (Zero Target Code Execution F-S5)', () => {
  const tempDirs: string[] = [];

  function cloneFixtureToTemp(fixtureRelPath: string): string {
    const src = path.resolve(fixtureRelPath);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-django-fixture-'));
    tempDirs.push(dest);
    fs.cpSync(src, dest, { recursive: true });
    return dest;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects Django project via manage.py and settings.py', async () => {
    const djangoDir = cloneFixtureToTemp('tests/fixtures/django-sample');
    const adapter = new DjangoAdapter();

    const files = [
      'manage.py',
      'myproject/settings.py',
      'myproject/urls.py',
      'myapp/views.py',
      'templates/base.html',
      'templates/home.html',
    ];
    const contents = new Map<string, string>();
    for (const f of files) {
      contents.set(f, fs.readFileSync(path.join(djangoDir, f), 'utf-8'));
    }

    const detected = await adapter.detect(djangoDir, files, contents);
    expect(detected).toBe(true);
  });

  it('statically parses urls.py and views.py without executing Python runtime', () => {
    const urlsContent = `
from django.urls import path, re_path
from myapp import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('boutique/', views.ShopView.as_view(), name='shop'),
    path('articles/<slug:slug>/', views.article_detail, name='article_detail'),
    re_path(r'^docs/(?P<topic>[a-z]+)/$', views.docs_view, name='docs'),
]
`;

    const discovered = parseDjangoUrls(urlsContent);
    expect(discovered.map((d) => d.pattern).sort()).toEqual(['/', '/articles/:slug', '/boutique', '/docs/:topic']);
    expect(discovered.every((d) => d.lineNumber >= 1)).toBe(true);

    const viewsContent = `
from django.shortcuts import render
from django.views.generic import TemplateView

def home_view(request):
    return render(request, 'home.html', {'title': 'Home'})

class ShopView(TemplateView):
    template_name = 'shop.html'
`;

    const mappings = parseDjangoViews(viewsContent);
    expect(mappings).toEqual([
      { viewName: 'home_view', templateName: 'home.html' },
      { viewName: 'ShopView', templateName: 'shop.html' },
    ]);
  });

  it('discovers routes and resolves templates with DTL inheritance and dynamic markers', async () => {
    const djangoDir = cloneFixtureToTemp('tests/fixtures/django-sample');
    const adapter = new DjangoAdapter();

    const files = [
      'manage.py',
      'myproject/settings.py',
      'myproject/urls.py',
      'myapp/views.py',
      'templates/base.html',
      'templates/home.html',
      'templates/shop.html',
      'templates/article_detail.html',
      'templates/contact.html',
    ];
    const contents = new Map<string, string>();
    for (const f of files) {
      contents.set(f, fs.readFileSync(path.join(djangoDir, f), 'utf-8'));
    }

    const routes = await adapter.discoverRoutes(djangoDir, files, contents, new Set(['/']));
    expect(routes.map((r) => r.pattern).sort()).toEqual(['/', '/articles/:slug', '/boutique', '/contact']);

    // Check home route extraction
    const homeRoute = routes.find((r) => r.pattern === '/')!;
    expect(homeRoute.filePath).toContain('home.html');

    const homeData = await adapter.extractRoute(djangoDir, homeRoute, contents.get(homeRoute.filePath)!);
    expect(homeData.title?.value).toBe('Accueil officiel Django');
    expect(homeData.description?.value).toBe('Plateforme e-commerce performante sous Django');
    expect(homeData.htmlLang?.value).toBe('fr'); // Inherited from base.html
    expect(homeData.headings.some((h) => h.text.includes('Bienvenue sur notre boutique Django'))).toBe(true);

    // Check dynamic route extraction (article_detail)
    const articleRoute = routes.find((r) => r.pattern === '/articles/:slug')!;
    const articleData = await adapter.extractRoute(djangoDir, articleRoute, contents.get(articleRoute.filePath)!);
    expect(articleData.title?.value).toBe('[Valeur dynamique]');
    expect(articleData.isDynamic).toBe(true);
  });
});

