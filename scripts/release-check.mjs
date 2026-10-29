import fs from 'node:fs';
import path from 'node:path';

export function checkReleaseReadiness(projectRoot = process.cwd()) {
  const rootPkgPath = path.join(projectRoot, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));

  const packagesDir = path.join(projectRoot, 'packages');
  const packageDirs = fs.readdirSync(packagesDir);
  const issues = [];
  const packageSummaries = [];

  if (rootPkg.version !== '1.0.0') {
    issues.push(`Root package.json version is '${rootPkg.version}' (expected '1.0.0')`);
  }

  for (const dir of packageDirs) {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const summary = {
      name: pkg.name,
      dir,
      version: pkg.version,
      access: pkg.publishConfig?.access,
    };
    packageSummaries.push(summary);

    if (pkg.version !== '1.0.0') {
      issues.push(`Package ${pkg.name} (${dir}) has version '${pkg.version}' (expected '1.0.0')`);
    }

    if (pkg.publishConfig?.access !== 'public') {
      issues.push(`Package ${pkg.name} (${dir}) is missing publishConfig.access = "public"`);
    }

    if (!pkg.license) {
      issues.push(`Package ${pkg.name} (${dir}) is missing license field`);
    }
  }

  const valid = issues.length === 0 && packageSummaries.length >= 12;

  return {
    valid,
    version: '1.0.0',
    packagesCount: packageSummaries.length,
    packages: packageSummaries,
    issues,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))) {
  const report = checkReleaseReadiness();
  console.log(`[RELEASE CHECK] Scanned ${report.packagesCount} monorepo packages for v1.0.0 release readiness.`);

  if (!report.valid) {
    console.error(`[RELEASE CHECK FAILED] Found ${report.issues.length} release configuration issue(s):`);
    for (const issue of report.issues) {
      console.error(` - ${issue}`);
    }
    process.exit(1);
  } else {
    console.log('[RELEASE CHECK PASS] All 12 packages are valid, versioned 1.0.0, and configured for public npm release.');
  }
}

