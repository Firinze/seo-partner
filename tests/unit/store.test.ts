import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DecisionRepository,
  FindingRepository,
  ProjectRepository,
  SeoDatabase,
} from '@seo-partner/store';
import { ALL_V01_RULES, RULE_TECH_03, createFindingFromRule } from '@seo-partner/rules';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d && fs.existsSync(d)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  }
});

describe('Phase 2 & US3: SQLite WAL Store & Finding Status Transitions', () => {
  it('initializes SQLite in WAL mode and manages project, findings, and resolved transitions', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-store-'));
    tempDirs.push(root);

    const store = SeoDatabase.open(root);
    try {
      expect(store.getJournalMode()).toBe('wal');

      const projectRepo = new ProjectRepository(store);
      projectRepo.upsertProject({
        id: 'proj_1',
        rootPath: root,
        name: 'test-proj',
        frameworks: ['nextjs'],
        hasRobotsTxt: true,
        hasSitemap: true,
        createdAt: '2026-10-28T00:00:00Z',
        lastScannedAt: '2026-10-28T00:00:00Z',
      });

      const loaded = projectRepo.getLatestProject();
      expect(loaded?.name).toBe('test-proj');

      const findingRepo = new FindingRepository(store);
      findingRepo.syncRulesCatalog(ALL_V01_RULES);

      const f1 = createFindingFromRule(RULE_TECH_03, {
        subjectRef: '/pricing',
        evidence: {
          source: 'code-scan',
          filePath: 'src/app/pricing/page.tsx',
          lineNumber: 7,
          observed: 'noindex',
          expected: 'index',
        },
        remediation: {
          en: 'Remove noindex',
          fr: 'Retirer noindex',
        },
      });

      findingRepo.syncFindingsAndActions([f1]);
      expect(findingRepo.listFindings()).toHaveLength(1);
      expect(findingRepo.listPrioritizedActions()).toHaveLength(1);

      // When subsequent scan has 0 findings, f1 transitions automatically to 'resolved'
      findingRepo.syncFindingsAndActions([]);
      expect(findingRepo.listFindings({ includeResolved: false })).toHaveLength(0);
      const withResolved = findingRepo.listFindings({ includeResolved: true });
      expect(withResolved[0]?.status).toBe('resolved');
      expect(withResolved[0]?.resolvedAt).not.toBeNull();

      // Decision repository test
      const decisionRepo = new DecisionRepository(store);
      decisionRepo.addDecision({
        date: '2026-10-28',
        title: 'Keep /dashboard private',
        rationale: 'Authenticated customer area',
        findingId: f1.id,
      });
      expect(decisionRepo.listDecisions()).toHaveLength(1);
    } finally {
      store.close();
    }
  });
});

