import { describe, it, expect } from 'vitest';
import { parseUnifiedDiffLines } from '../../packages/dashboard/src/components/features/DiffViewer.js';

describe('DiffViewer Parser', () => {
  const sampleDiff = `--- a/page.tsx
+++ b/page.tsx
@@ -1,5 +1,9 @@
 export default function Page() {
-  return <div>Vieux Titre</div>;
+  return <div>Nouveau Titre</div>;
+  // Added line
 }`;

  it('parses unified diff lines into typed entries', () => {
    const lines = parseUnifiedDiffLines(sampleDiff);
    expect(lines.length).toBeGreaterThan(0);

    const additions = lines.filter((l) => l.type === 'addition');
    const deletions = lines.filter((l) => l.type === 'deletion');
    const unchanged = lines.filter((l) => l.type === 'unchanged');

    expect(additions.length).toBe(2);
    expect(deletions.length).toBe(1);
    expect(unchanged.length).toBeGreaterThan(0);
  });
});

