export interface SecretPattern {
  readonly id: string;
  readonly name: string;
  readonly pattern: RegExp;
  readonly severity: 'critical' | 'high';
}

export interface SecretFinding {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly filePath?: string;
  readonly lineNumber?: number;
  readonly matchedText: string;
  readonly maskedValue: string;
}

export const KNOWN_SECRET_PATTERNS: ReadonlyArray<SecretPattern> = [
  {
    id: 'sec-google-api-key',
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: 'critical',
  },
  {
    id: 'sec-openai-or-anthropic-key',
    name: 'OpenAI/Anthropic Secret Key',
    pattern: /sk-[a-zA-Z0-9\-_]{24,}/g,
    severity: 'critical',
  },
  {
    id: 'sec-github-pat',
    name: 'GitHub Personal Access Token',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,}/g,
    severity: 'critical',
  },
  {
    id: 'sec-aws-access-key',
    name: 'AWS Access Key ID',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
  },
  {
    id: 'sec-private-key-header',
    name: 'Private Key Header',
    pattern: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g,
    severity: 'critical',
  },
  {
    id: 'sec-service-account-json',
    name: 'Google Service Account Private Key Field',
    pattern: /"private_key":\s*"-----BEGIN/g,
    severity: 'critical',
  },
];

export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '***';
  }
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}...${suffix}`;
}

export function detectSecrets(content: string, filePath?: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx] ?? '';
    for (const rule of KNOWN_SECRET_PATTERNS) {
      // Reset lastIndex for global regexp
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null = null;
      while ((match = rule.pattern.exec(line)) !== null) {
        const secretStr = match[0];
        findings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          filePath,
          lineNumber: lineIdx + 1,
          matchedText: secretStr,
          maskedValue: maskSecret(secretStr),
        });
      }
    }
  }

  return findings;
}
