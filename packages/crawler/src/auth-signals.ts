export const AUTH_CODE_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  // Next.js / React
  { name: 'next-auth-session', pattern: /\b(getServerSession|useSession|auth)\s*\(/i },
  { name: 'auth-hook-user', pattern: /\b(useUser|useAuth)\s*\(/i },
  { name: 'login-redirect', pattern: /\bredirect\s*\(\s*['"`]\/(login|signin|auth|connexion)['"`]/i },
  { name: 'next-auth-middleware', pattern: /\bwithAuth\s*\(/i },

  // Laravel (PHP)
  { name: 'laravel-auth-middleware', pattern: /\$this->middleware\s*\(\s*['"`]auth['"`]/i },
  { name: 'laravel-auth-helper', pattern: /\bauth\(\)->(user|check)\s*\(/i },
  { name: 'laravel-gate-authorize', pattern: /\bGate::authorize\s*\(/i },
  { name: 'laravel-route-auth-group', pattern: /->middleware\s*\(\s*\[?[^\]]*['"`]auth['"`]/i },

  // Symfony (PHP)
  { name: 'symfony-is-granted', pattern: /#\[IsGranted\s*\(\s*['"`]ROLE_/i },
  { name: 'symfony-deny-access', pattern: /\bdenyAccessUnlessGranted\s*\(/i },
  { name: 'symfony-twig-is-granted', pattern: /is_granted\s*\(\s*['"`]ROLE_/i },

  // Django (Python)
  { name: 'django-login-required', pattern: /@login_required/i },
  { name: 'django-login-mixin', pattern: /class\s+\w+\s*\([^)]*LoginRequiredMixin[^)]*\):/i },
  { name: 'django-auth-check', pattern: /request\.user\.is_authenticated/i },
  { name: 'django-perm-required', pattern: /@permission_required/i },

  // Generic / Node / Express / PHP
  { name: 'express-passport-auth', pattern: /req\.isAuthenticated\s*\(/i },
  { name: 'jwt-verify', pattern: /\bjwt\.verify\s*\(/i },
  { name: 'php-session-user', pattern: /\$_SESSION\s*\[\s*['"`](user|auth|admin|logged)['"`]\s*\]/i },
];

export function detectAuthSignalsInContent(fileContent: string): string[] {
  const detected: string[] = [];
  for (const { name, pattern } of AUTH_CODE_PATTERNS) {
    if (pattern.test(fileContent)) {
      detected.push(name);
    }
  }
  return detected;
}

