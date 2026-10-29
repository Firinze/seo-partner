import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseProxyAndRouteRules,
  classifyRoute,
} from '../../packages/crawler/src/index.js';

describe('Route Config & Proxy Parser (US2)', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('parses Apache .htaccess basic auth barriers', () => {
    const htaccess = `
      AuthType Basic
      AuthName "Restricted Admin Area"
      Require valid-user
    `;
    fs.writeFileSync(path.join(projectDir, '.htaccess'), htaccess, 'utf-8');

    const hints = parseProxyAndRouteRules(projectDir);
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0].isPrivate).toBe(true);

    const classification = classifyRoute('public/index.php', '<?php echo "hello"; ?>', '/admin/test', hints);
    expect(classification.scope).toBe('private');
    expect(classification.recommendedRobots).toBe('noindex, nofollow');
  });

  it('parses Nginx auth_basic location blocks', () => {
    const nginxConf = `
      server {
        location /admin/ {
          auth_basic "Admin Area";
          auth_basic_user_file /etc/nginx/.htpasswd;
        }
      }
    `;
    fs.writeFileSync(path.join(projectDir, 'nginx.conf'), nginxConf, 'utf-8');

    const hints = parseProxyAndRouteRules(projectDir);
    expect(hints.some((h) => h.reason === 'nginx-auth-basic')).toBe(true);

    const classification = classifyRoute('views/admin.php', '<div>Admin</div>', '/admin/dashboard', hints);
    expect(classification.scope).toBe('private');
  });
});

