export interface RobotsDirectiveRule {
  readonly type: 'allow' | 'disallow';
  readonly pattern: string;
}

export interface ParsedRobotsPolicy {
  readonly rulesByAgent: ReadonlyMap<string, ReadonlyArray<RobotsDirectiveRule>>;
  readonly sitemaps: ReadonlyArray<string>;
  readonly blocksAllBots: boolean;
  readonly blockedAiBots: ReadonlyArray<string>;
}

const KNOWN_AI_BOTS = ['gptbot', 'google-extended', 'claudebot', 'perplexitybot', 'ccbot'];

export function parseRobotsTxtContent(content: string): ParsedRobotsPolicy {
  const rulesMap = new Map<string, RobotsDirectiveRule[]>();
  const sitemaps: string[] = [];
  let currentAgents: string[] = [];
  let lastLineWasAgent = false;

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const withoutComment = rawLine.split('#')[0]?.trim() ?? '';
    if (!withoutComment) {
      lastLineWasAgent = false;
      continue;
    }

    const colonIdx = withoutComment.indexOf(':');
    if (colonIdx === -1) continue;

    const directive = withoutComment.slice(0, colonIdx).trim().toLowerCase();
    const value = withoutComment.slice(colonIdx + 1).trim();

    if (directive === 'user-agent') {
      const agent = value.toLowerCase();
      if (!lastLineWasAgent) {
        currentAgents = [agent];
      } else {
        currentAgents.push(agent);
      }
      if (!rulesMap.has(agent)) {
        rulesMap.set(agent, []);
      }
      lastLineWasAgent = true;
    } else if (directive === 'allow' || directive === 'disallow') {
      lastLineWasAgent = false;
      if (currentAgents.length === 0) {
        currentAgents = ['*'];
        if (!rulesMap.has('*')) rulesMap.set('*', []);
      }
      for (const agent of currentAgents) {
        const list = rulesMap.get(agent) ?? [];
        list.push({ type: directive, pattern: value });
        rulesMap.set(agent, list);
      }
    } else if (directive === 'sitemap' && value) {
      lastLineWasAgent = false;
      sitemaps.push(value);
    }
  }

  const wildcardRules = rulesMap.get('*') ?? [];
  const blocksAllBots = wildcardRules.some(
    (r) => r.type === 'disallow' && r.pattern.trim() === '/',
  ) && !wildcardRules.some((r) => r.type === 'allow' && r.pattern.trim().length > 0);

  const blockedAiBots: string[] = [];
  for (const bot of KNOWN_AI_BOTS) {
    const botRules = rulesMap.get(bot) ?? [];
    if (botRules.some((r) => r.type === 'disallow' && r.pattern.trim() === '/')) {
      blockedAiBots.push(bot);
    }
  }

  return {
    rulesByAgent: rulesMap,
    sitemaps,
    blocksAllBots,
    blockedAiBots,
  };
}

function matchesRobotsPattern(pathname: string, pattern: string): boolean {
  if (!pattern) return false;
  let regexStr = '^';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i]!;
    if (ch === '*') {
      regexStr += '.*';
    } else if (ch === '$' && i === pattern.length - 1) {
      regexStr += '$';
    } else {
      regexStr += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  try {
    return new RegExp(regexStr).test(pathname);
  } catch {
    return pathname.startsWith(pattern);
  }
}

export function isAllowedByRobots(
  policy: ParsedRobotsPolicy,
  urlPathname: string,
  userAgent = 'seo-partner-bot/0.2',
): boolean {
  const uaLower = userAgent.toLowerCase();
  const shortUa = uaLower.split('/')[0] ?? uaLower;

  const applicableRules =
    policy.rulesByAgent.get(uaLower) ??
    policy.rulesByAgent.get(shortUa) ??
    policy.rulesByAgent.get('*') ??
    [];

  let bestMatch: RobotsDirectiveRule | null = null;
  let bestLength = -1;

  for (const rule of applicableRules) {
    if (!rule.pattern) {
      // Empty Disallow: means allow all
      continue;
    }
    if (matchesRobotsPattern(urlPathname, rule.pattern)) {
      const len = rule.pattern.length;
      if (
        len > bestLength ||
        (len === bestLength && rule.type === 'allow')
      ) {
        bestMatch = rule;
        bestLength = len;
      }
    }
  }

  if (!bestMatch) return true;
  return bestMatch.type === 'allow';
}

export class RateLimiter {
  private readonly lastRequestByHost = new Map<string, number>();

  public constructor(private readonly minDelayMs: number) {}

  public async waitForSlot(hostname: string): Promise<void> {
    if (this.minDelayMs <= 0) return;
    const key = hostname.toLowerCase();
    const now = Date.now();
    const last = this.lastRequestByHost.get(key) ?? 0;
    const elapsed = now - last;

    if (elapsed < this.minDelayMs) {
      const waitMs = this.minDelayMs - elapsed;
      this.lastRequestByHost.set(key, now + waitMs);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    } else {
      this.lastRequestByHost.set(key, now);
    }
  }
}

