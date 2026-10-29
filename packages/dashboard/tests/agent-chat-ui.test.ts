import { describe, it, expect } from 'vitest';
import { renderAgentChatFeature } from '../src/components/features/chat-feature.js';
import { renderDashboardSpaHtml } from '../src/bundle.js';

describe('Agent Chat UI & Accessibility (Unit)', () => {
  it('should render the agent chat feature with accessible elements', () => {
    const html = renderAgentChatFeature('fr');
    expect(html).toContain('id="panel-chat"');
    expect(html).toContain('id="agent-chat-goal"');
    expect(html).toContain('id="btn-agent-run"');
    expect(html).toContain('id="apply-patch-modal"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-live="polite"');
    // Ensure no glassmorphism
    expect(html).not.toContain('backdrop-filter');
    // Ensure no emojis
    expect(html).not.toMatch(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
  });

  it('should integrate the Agent Chat tab in the full SPA HTML', () => {
    const fullHtml = renderDashboardSpaHtml({
      lang: 'fr',
      overview: {
        healthy: true,
        project: {
          id: 'test-proj',
          rootPath: '/test',
          name: 'test',
          frameworks: [],
          hasRobotsTxt: false,
          hasSitemap: false,
          createdAt: new Date().toISOString(),
          lastScannedAt: null,
        },
        filesCount: 10,
        routesCount: 5,
        findingsCount: 0,
        blockingCount: 0,
        latestScanDate: null,
        latestCrawlRun: null,
      },
      routes: [],
      findings: [],
      backlog: [],
      comparisonRows: [],
      decisions: [],
    });

    expect(fullHtml).toContain('tab-btn-chat');
    expect(fullHtml).toContain('Agent Chat');
    expect(fullHtml).toContain('panel-chat');
    expect(fullHtml).not.toContain('backdrop-filter');
  });
});

