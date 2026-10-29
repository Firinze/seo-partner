export type PhpFlavor = 'laravel' | 'symfony' | 'php';

export interface DiscoveredPhpRouteEntry {
  readonly pattern: string;
  readonly filePath: string;
  readonly flavor: PhpFlavor;
}

export function detectPhpFlavor(
  filePaths: ReadonlyArray<string>,
  contentsByPath: ReadonlyMap<string, string>,
): PhpFlavor | null {
  const composerJson = contentsByPath.get('composer.json') ?? '';
  if (
    composerJson.includes('laravel/framework') ||
    filePaths.includes('artisan') ||
    filePaths.some((p) => p.endsWith('.blade.php'))
  ) {
    return 'laravel';
  }

  if (
    composerJson.includes('symfony/framework-bundle') ||
    composerJson.includes('symfony/twig-bundle') ||
    filePaths.some((p) => p.endsWith('.html.twig'))
  ) {
    return 'symfony';
  }

  if (filePaths.some((p) => p.endsWith('.php'))) {
    return 'php';
  }

  return null;
}

function normalizeRoutePattern(rawPattern: string): string {
  const trimmed = rawPattern.trim();
  if (!trimmed || trimmed === '/') return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

export function parseLaravelRoutes(
  filePaths: ReadonlyArray<string>,
  contentsByPath: ReadonlyMap<string, string>,
): ReadonlyArray<DiscoveredPhpRouteEntry> {
  const viewPathByDotName = new Map<string, string>();
  for (const fp of filePaths) {
    if (fp.startsWith('resources/views/') && fp.endsWith('.blade.php')) {
      const rel = fp
        .slice('resources/views/'.length)
        .slice(0, -'.blade.php'.length);
      const dotName = rel.replace(/\//g, '.');
      viewPathByDotName.set(dotName, fp);
      viewPathByDotName.set(rel, fp);
    }
  }

  const results: DiscoveredPhpRouteEntry[] = [];
  const mappedFiles = new Set<string>();
  const webPhp = contentsByPath.get('routes/web.php') ?? '';

  if (webPhp) {
    // 1. Route::view('/uri', 'view.name')
    const routeViewRegex =
      /Route::view\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = routeViewRegex.exec(webPhp)) !== null) {
      const pattern = normalizeRoutePattern(m[1] ?? '/');
      const viewName = m[2] ?? '';
      const filePath = viewPathByDotName.get(viewName);
      if (filePath) {
        results.push({ pattern, filePath, flavor: 'laravel' });
        mappedFiles.add(filePath);
      }
    }

    // 2. Route::get('/uri', function() { return view('view.name'); })
    const routeClosureRegex =
      /Route::(?:get|any)\s*\(\s*['"]([^'"]+)['"][\s\S]*?view\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = routeClosureRegex.exec(webPhp)) !== null) {
      const pattern = normalizeRoutePattern(m[1] ?? '/');
      const viewName = m[2] ?? '';
      const filePath = viewPathByDotName.get(viewName);
      if (filePath && !mappedFiles.has(filePath)) {
        results.push({ pattern, filePath, flavor: 'laravel' });
        mappedFiles.add(filePath);
      }
    }

    // 3. Controller-based routes: Route::get('/uri', [Controller::class, 'method'])
    const routeControllerRegex =
      /Route::(?:get|any)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:\[|\w+Controller)/g;
    while ((m = routeControllerRegex.exec(webPhp)) !== null) {
      const pattern = normalizeRoutePattern(m[1] ?? '/');
      if (!results.some((r) => r.pattern === pattern)) {
        results.push({ pattern, filePath: 'routes/web.php', flavor: 'laravel' });
      }
    }
  }

  // Fallback for any public Blade view not explicitly matched in routes/web.php
  for (const [dotName, filePath] of viewPathByDotName.entries()) {
    if (mappedFiles.has(filePath) || dotName.includes('/')) continue;
    if (
      dotName.startsWith('layouts.') ||
      dotName.startsWith('components.') ||
      dotName.startsWith('partials.') ||
      dotName.startsWith('emails.') ||
      dotName.startsWith('errors.') ||
      dotName.startsWith('vendor.')
    ) {
      continue;
    }
    const pattern =
      dotName === 'welcome' || dotName === 'home' || dotName === 'index'
        ? '/'
        : `/${dotName.replace(/\.index$/, '').replace(/\./g, '/')}`;
    results.push({
      pattern: normalizeRoutePattern(pattern),
      filePath,
      flavor: 'laravel',
    });
    mappedFiles.add(filePath);
  }

  return results;
}

export function parseSymfonyRoutes(
  filePaths: ReadonlyArray<string>,
  contentsByPath: ReadonlyMap<string, string>,
): ReadonlyArray<DiscoveredPhpRouteEntry> {
  const twigTemplates = new Set<string>(
    filePaths.filter((p) => p.startsWith('templates/') && p.endsWith('.html.twig')),
  );

  const results: DiscoveredPhpRouteEntry[] = [];
  const mappedFiles = new Set<string>();

  // 1. Parse PHP 8 #[Route('/path')] attributes in src/Controller/**/*.php
  for (const fp of filePaths) {
    if (!fp.startsWith('src/Controller/') || !fp.endsWith('.php')) continue;
    const content = contentsByPath.get(fp) ?? '';
    const attrRegex =
      /#\[Route\s*\(\s*(?:path:\s*)?['"]([^'"]+)['"][^\]]*\)\][\s\S]*?\$this->render\s*\(\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(content)) !== null) {
      const pattern = normalizeRoutePattern(m[1] ?? '/');
      const relTwig = (m[2] ?? '').replace(/^\/+/, '');
      const fullTwig = `templates/${relTwig}`;
      if (twigTemplates.has(fullTwig)) {
        results.push({ pattern, filePath: fullTwig, flavor: 'symfony' });
        mappedFiles.add(fullTwig);
      }
    }
  }

  // 2. Parse config/routes.yaml
  const routesYaml = contentsByPath.get('config/routes.yaml') ?? '';
  if (routesYaml) {
    const blocks = routesYaml.split(/\r?\n(?=[a-zA-Z0-9_-]+:\s*$)/m);
    for (const block of blocks) {
      const pathMatch = /\bpath:\s*['"]?([^\s'"]+)['"]?/.exec(block);
      const ctrlMatch =
        /\bcontroller:\s*[\w\\]+\\([A-Za-z0-9_]+)Controller::([a-zA-Z0-9_]+)/.exec(
          block,
        );
      if (pathMatch?.[1] && ctrlMatch?.[1] && ctrlMatch[2]) {
        const pattern = normalizeRoutePattern(pathMatch[1]);
        const folder = ctrlMatch[1].toLowerCase();
        const action = ctrlMatch[2].toLowerCase();
        const candidate = `templates/${folder}/${action}.html.twig`;
        if (twigTemplates.has(candidate) && !mappedFiles.has(candidate)) {
          results.push({ pattern, filePath: candidate, flavor: 'symfony' });
          mappedFiles.add(candidate);
        }
      }
    }
  }

  // 3. Fallback for unmapped public templates
  for (const twigPath of twigTemplates) {
    if (mappedFiles.has(twigPath)) continue;
    const rel = twigPath.slice('templates/'.length, -'.html.twig'.length);
    if (
      rel === 'base' ||
      rel.startsWith('layouts/') ||
      rel.startsWith('partials/') ||
      rel.startsWith('components/') ||
      rel.startsWith('bundles/')
    ) {
      continue;
    }
    const cleaned = rel.replace(/\/index$/, '');
    const pattern =
      cleaned === 'home' || cleaned === 'index' || cleaned === 'default'
        ? '/'
        : normalizeRoutePattern(cleaned);
    results.push({ pattern, filePath: twigPath, flavor: 'symfony' });
    mappedFiles.add(twigPath);
  }

  return results;
}

export function discoverNativePhpRoutes(
  filePaths: ReadonlyArray<string>,
): ReadonlyArray<DiscoveredPhpRouteEntry> {
  const results: DiscoveredPhpRouteEntry[] = [];
  const publicPhpFiles = filePaths.filter(
    (p) => p.startsWith('public/') && p.endsWith('.php'),
  );

  if (publicPhpFiles.length > 0) {
    for (const fp of publicPhpFiles) {
      const rel = fp.slice('public/'.length);
      const pattern =
        rel === 'index.php' ? '/' : normalizeRoutePattern(rel);
      results.push({ pattern, filePath: fp, flavor: 'php' });
    }
    return results;
  }

  for (const fp of filePaths) {
    if (!fp.endsWith('.php')) continue;
    const lower = fp.toLowerCase();
    if (
      lower === 'artisan' ||
      lower.startsWith('includes/') ||
      lower.startsWith('inc/') ||
      lower.startsWith('config/') ||
      lower.startsWith('vendor/') ||
      lower.startsWith('routes/') ||
      lower.startsWith('src/') ||
      lower.startsWith('app/') ||
      lower.startsWith('tests/') ||
      lower.endsWith('header.php') ||
      lower.endsWith('footer.php') ||
      lower.endsWith('functions.php')
    ) {
      continue;
    }
    const pattern =
      fp === 'index.php' ? '/' : normalizeRoutePattern(fp);
    results.push({ pattern, filePath: fp, flavor: 'php' });
  }

  return results;
}

