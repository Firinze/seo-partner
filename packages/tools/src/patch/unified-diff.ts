import type { PatchHunk } from '@seo-partner/core';

export const MAX_DIFF_LINES = 5000;

export interface DiffResult {
  readonly hunks: ReadonlyArray<PatchHunk>;
  readonly diffText: string;
}

/**
 * Computes the Longest Common Subsequence (LCS) table between two arrays of lines.
 */
function computeLcsMatrix(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): number[][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    const rowCurrent = dp[i + 1]!;
    const rowPrev = dp[i]!;
    for (let j = 0; j < m; j++) {
      if (a[i] === b[j]) {
        rowCurrent[j + 1] = (rowPrev[j] ?? 0) + 1;
      } else {
        rowCurrent[j + 1] = Math.max(rowPrev[j + 1] ?? 0, rowCurrent[j] ?? 0);
      }
    }
  }

  return dp;
}

export type EditOperation =
  | { readonly type: 'equal'; readonly oldLine: string; readonly newLine: string }
  | { readonly type: 'delete'; readonly oldLine: string }
  | { readonly type: 'insert'; readonly newLine: string };

function backtrackEdits(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
  dp: number[][],
): EditOperation[] {
  let i = a.length;
  let j = b.length;
  const edits: EditOperation[] = [];

  while (i > 0 || j > 0) {
    const prevA = a[i - 1];
    const prevB = b[j - 1];
    const dpCurrent = dp[i];
    const dpPrev = dp[i - 1];
    const dpCurrentVal = dpCurrent ? (dpCurrent[j - 1] ?? 0) : 0;
    const dpPrevVal = dpPrev ? (dpPrev[j] ?? 0) : 0;

    if (i > 0 && j > 0 && prevA !== undefined && prevB !== undefined && prevA === prevB) {
      edits.push({ type: 'equal', oldLine: prevA, newLine: prevB });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dpCurrentVal >= dpPrevVal)) {
      if (prevB !== undefined) {
        edits.push({ type: 'insert', newLine: prevB });
      }
      j--;
    } else if (i > 0 && (j === 0 || dpCurrentVal < dpPrevVal)) {
      if (prevA !== undefined) {
        edits.push({ type: 'delete', oldLine: prevA });
      }
      i--;
    }
  }

  edits.reverse();
  return edits;
}

/**
 * Generates unified diff hunks and formatted text for a file modification or creation.
 */
export function generateUnifiedDiff(
  filePath: string,
  originalContent: string,
  newContent: string,
  isCreation = false,
  contextLines = 3,
): DiffResult {
  // Normalize line breaks for diffing while detecting original line ending
  const hasCrLf = originalContent.includes('\r\n') || (!originalContent && newContent.includes('\r\n'));
  const normalizedOrig = originalContent.replace(/\r\n/g, '\n');
  const normalizedNew = newContent.replace(/\r\n/g, '\n');

  const oldLines = originalContent.length === 0 && isCreation ? [] : normalizedOrig.split('\n');
  const newLines = normalizedNew.length === 0 ? [] : normalizedNew.split('\n');

  if (oldLines.length > MAX_DIFF_LINES || newLines.length > MAX_DIFF_LINES) {
    throw new Error(`File "${filePath}" exceeds the maximum diff size of ${MAX_DIFF_LINES} lines.`);
  }

  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const oldHeader = isCreation ? '--- /dev/null' : `--- a/${normalizedPath}`;
  const newHeader = `+++ b/${normalizedPath}`;

  if (isCreation) {
    const hunkLines = newLines.map((l) => `+${l}`);
    const hunk: PatchHunk = {
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: newLines.length,
      lines: hunkLines,
    };
    const diffText = [
      oldHeader,
      newHeader,
      `@@ -0,0 +1,${newLines.length} @@`,
      ...hunkLines,
    ].join('\n') + '\n';

    return {
      hunks: [hunk],
      diffText,
    };
  }

  const dp = computeLcsMatrix(oldLines, newLines);
  const edits = backtrackEdits(oldLines, newLines, dp);

  // Group edits into hunks with contextLines of context
  interface RawHunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }

  const hunks: RawHunk[] = [];
  let currentHunk: RawHunk | null = null;
  let oldLineNum = 1;
  let newLineNum = 1;

  for (let idx = 0; idx < edits.length; idx++) {
    const edit = edits[idx];
    if (!edit) continue;

    if (edit.type !== 'equal') {
      // Find window of context
      if (!currentHunk) {
        const startContextIdx = Math.max(0, idx - contextLines);
        const prefixContext: string[] = [];
        let prefixOldCount = 0;
        let prefixNewCount = 0;

        for (let c = startContextIdx; c < idx; c++) {
          const cEdit = edits[c];
          if (cEdit && cEdit.type === 'equal') {
            prefixContext.push(` ${cEdit.oldLine}`);
            prefixOldCount++;
            prefixNewCount++;
          }
        }

        currentHunk = {
          oldStart: oldLineNum - prefixOldCount,
          oldLines: prefixOldCount,
          newStart: newLineNum - prefixNewCount,
          newLines: prefixNewCount,
          lines: [...prefixContext],
        };
      }

      if (edit.type === 'delete') {
        currentHunk.lines.push(`-${edit.oldLine}`);
        currentHunk.oldLines++;
        oldLineNum++;
      } else if (edit.type === 'insert') {
        currentHunk.lines.push(`+${edit.newLine}`);
        currentHunk.newLines++;
        newLineNum++;
      }
    } else {
      // equal line
      if (currentHunk) {
        // Lookahead: is there another change within 2 * contextLines?
        let nextChangeDist = -1;
        for (let next = idx; next < Math.min(edits.length, idx + 2 * contextLines + 1); next++) {
          const nextEdit = edits[next];
          if (nextEdit && nextEdit.type !== 'equal') {
            nextChangeDist = next - idx;
            break;
          }
        }

        if (nextChangeDist !== -1) {
          // Keep appending equal line to current hunk
          currentHunk.lines.push(` ${edit.oldLine}`);
          currentHunk.oldLines++;
          currentHunk.newLines++;
        } else {
          // Append up to contextLines suffix lines and close hunk
          currentHunk.lines.push(` ${edit.oldLine}`);
          currentHunk.oldLines++;
          currentHunk.newLines++;

          let added = 1;
          let k = idx + 1;
          while (added < contextLines && k < edits.length) {
            const kEdit = edits[k];
            if (kEdit && kEdit.type === 'equal') {
              currentHunk.lines.push(` ${kEdit.oldLine}`);
              currentHunk.oldLines++;
              currentHunk.newLines++;
              added++;
              k++;
              oldLineNum++;
              newLineNum++;
              idx = k - 1;
            } else {
              break;
            }
          }

          hunks.push(currentHunk);
          currentHunk = null;
        }
      }
      oldLineNum++;
      newLineNum++;
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  if (hunks.length === 0) {
    return {
      hunks: [],
      diffText: '',
    };
  }

  const diffLines: string[] = [oldHeader, newHeader];
  for (const h of hunks) {
    diffLines.push(`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`);
    diffLines.push(...h.lines);
  }

  const diffText = diffLines.join('\n') + '\n';
  return {
    hunks,
    diffText,
  };
}

/**
 * Replays a unified diff against an original text and verifies that all context and deleted lines match.
 * Returns either the updated content or an error if divergence is detected.
 */
export function applyUnifiedDiff(
  originalContent: string,
  diffText: string,
): { readonly ok: true; readonly content: string } | { readonly ok: false; readonly error: string; readonly line?: number } {
  const isCrLf = originalContent.includes('\r\n');
  const normalizedOrig = originalContent.replace(/\r\n/g, '\n');
  const origLines = normalizedOrig.length === 0 ? [] : normalizedOrig.split('\n');

  const diffLines = diffText.replace(/\r\n/g, '\n').split('\n');

  // Check if it's a creation diff (--- /dev/null)
  const isCreation = diffLines[0]?.trim() === '--- /dev/null';
  if (isCreation) {
    const addedLines: string[] = [];
    for (const line of diffLines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines.push(line.slice(1));
      }
    }
    const result = addedLines.join(isCrLf ? '\r\n' : '\n');
    return { ok: true, content: result };
  }

  let lineIdx = 0;
  const outLines: string[] = [];
  let origCursor = 0; // 0-based index into origLines

  while (lineIdx < diffLines.length) {
    const line = diffLines[lineIdx];
    if (line === undefined) {
      lineIdx++;
      continue;
    }

    if (line.startsWith('@@')) {
      const match = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!match || match[1] === undefined) {
        return { ok: false, error: `Malformed hunk header: ${line}` };
      }

      const hunkOldStart = parseInt(match[1], 10); // 1-based line number in original
      const targetOrigIdx = Math.max(0, hunkOldStart - 1);

      // Copy unchanged lines from previous cursor up to targetOrigIdx
      while (origCursor < targetOrigIdx && origCursor < origLines.length) {
        const orig = origLines[origCursor];
        if (orig !== undefined) {
          outLines.push(orig);
        }
        origCursor++;
      }

      lineIdx++;

      // Process hunk body lines
      while (lineIdx < diffLines.length) {
        const hLine = diffLines[lineIdx];
        if (hLine === undefined || hLine.startsWith('@@')) {
          break;
        }
        if (hLine.length === 0 && lineIdx === diffLines.length - 1) {
          lineIdx++;
          break;
        }

        const prefix = hLine[0];
        const content = hLine.slice(1);

        if (prefix === ' ') {
          // Context line: must match current origLine
          if (origCursor >= origLines.length || origLines[origCursor] !== content) {
            return {
              ok: false,
              error: `Context mismatch at line ${origCursor + 1}: expected "${content}", found "${origLines[origCursor] ?? '<EOF>'}"`,
              line: origCursor + 1,
            };
          }
          outLines.push(content);
          origCursor++;
        } else if (prefix === '-') {
          // Deletion line: must match current origLine
          if (origCursor >= origLines.length || origLines[origCursor] !== content) {
            return {
              ok: false,
              error: `Deletion mismatch at line ${origCursor + 1}: expected "${content}", found "${origLines[origCursor] ?? '<EOF>'}"`,
              line: origCursor + 1,
            };
          }
          origCursor++; // drop from output
        } else if (prefix === '+') {
          // Addition line: add to output without advancing origCursor
          outLines.push(content);
        } else {
          // ignore headers or unknown lines
        }

        lineIdx++;
      }
    } else {
      lineIdx++;
    }
  }

  // Copy remaining lines after last hunk
  while (origCursor < origLines.length) {
    const orig = origLines[origCursor];
    if (orig !== undefined) {
      outLines.push(orig);
    }
    origCursor++;
  }

  const finalContent = outLines.join(isCrLf ? '\r\n' : '\n');
  return { ok: true, content: finalContent };
}
