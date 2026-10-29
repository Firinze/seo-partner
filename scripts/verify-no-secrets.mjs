import fs from 'node:fs';
import path from 'node:path';

export const SECRET_RULES = [
  {
    id: 'google-api-key',
    name: 'Google API Key',
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
  },
  {
    id: 'openai-anthropic-key',
    name: 'OpenAI/Anthropic Secret Key',
    regex: /sk-[a-zA-Z0-9\-_]{24,}/g,
  },
  {
    id: 'github-pat',
    name: 'GitHub Token',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,}/g,
  },
  {
    id: 'aws-access-key',
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    id: 'private-key',
    name: 'Private Key Block',
    regex: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g,
  },
  {
    id: 'google-service-account-private-key',
    name: 'Google Service Account Private Key',
    regex: /"private_key":\s*"-----BEGIN/g,
  },
];

const IGNORED_PATHS = [
  'node_modules',
  '.git',
  '.turbo',
  '.vscode',
  'dist/sbom',
  'tests/fixtures', // Sample mock data fixtures
];

export function scanFileForSecrets(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const findings = [];
  const lines = content.split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    for (const rule of SECRET_RULES) {
      rule.regex.lastIndex = 0;
      let match;
      while ((match = rule.regex.exec(line)) !== null) {
        // Ignore detection script self-definitions or secret-patterns definitions
        if (
          filePath.includes('secret-patterns.ts') ||
          filePath.includes('verify-no-secrets.mjs') ||
          filePath.includes('secret-leak.test.ts')
        ) {
          continue;
        }
        findings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          filePath,
          lineNumber: idx + 1,
          masked: match[0].slice(0, 4) + '...' + match[0].slice(-4),
        });
      }
    }
  }

  return findings;
}

export function scanDirectoryForSecrets(rootDir = process.cwd()) {
  const allFindings = [];
  let filesScanned = 0;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(currentDir, ent.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      if (IGNORED_PATHS.some((p) => relPath === p || relPath.startsWith(`${p}/`))) {
        continue;
      }

      if (ent.isDirectory()) {
        walk(fullPath);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.log', '.md'].includes(ext)) {
          filesScanned++;
          const f = scanFileForSecrets(fullPath);
          allFindings.push(...f);
        }
      }
    }
  }

  walk(rootDir);

  return {
    filesScanned,
    findings: allFindings,
    clean: allFindings.length === 0,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))) {
  const res = scanDirectoryForSecrets();
  if (!res.clean) {
    console.error(`[SECURITY ALERT] Found ${res.findings.length} secret(s) in codebase:`);
    for (const f of res.findings) {
      console.error(` - [${f.ruleName}] ${f.filePath}:${f.lineNumber}`);
    }
    process.exit(1);
  } else {
    console.log(`[SECURITY AUDIT PASS] Zero secrets found across ${res.filesScanned} scanned files.`);
  }
}
