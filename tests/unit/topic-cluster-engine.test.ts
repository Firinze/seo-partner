import { describe, it, expect } from 'vitest';
import {
  detectBlogPresence,
  generateTopicCluster,
} from '../../packages/agent/src/topic-cluster-generator.js';

describe('TopicClusterEngine', () => {
  it('detects absence of blog when no blog routes exist', () => {
    const routes = ['/', '/pricing', '/login', '/dashboard'];
    const result = detectBlogPresence(routes);
    expect(result.hasBlog).toBe(false);
    expect(result.recommendation).toContain('Création recommandée');
  });

  it('detects presence of blog when /blog or /actualites routes exist', () => {
    const routes = ['/', '/about', '/blog/premier-article'];
    const result = detectBlogPresence(routes);
    expect(result.hasBlog).toBe(true);
  });

  it('generates a topic cluster with 1 pillar and 5 to 10 satellites for a SaaS niche', () => {
    const cluster = generateTopicCluster({
      domainNiche: 'Facturation électronique et conformité 2026',
      targetAudience: 'Dirigeants de PME et experts-comptables',
    });

    expect(cluster.coreTheme).toBe('Facturation électronique et conformité 2026');
    expect(cluster.pillarPageUrl).toBe('/blog/guide-facturation-electronique-et-conformite-2026');
    expect(cluster.satelliteTopics.length).toBeGreaterThanOrEqual(5);
    expect(cluster.satelliteTopics.length).toBeLessThanOrEqual(10);

    for (const sat of cluster.satelliteTopics) {
      expect(sat.slug).toBeDefined();
      expect(sat.title).toBeDefined();
      expect(sat.targetKeyword).toBeDefined();
      expect(sat.wordCountTarget).toBeGreaterThanOrEqual(1000);
      expect(sat.summary.length).toBeGreaterThan(30);
    }
  });
});
