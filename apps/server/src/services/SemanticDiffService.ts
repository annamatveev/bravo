/**
 * SemanticDiffService — turns two versions of a Markdown document into a
 * *block-level* diff that reads like a collaborative wiki, not `git diff`.
 *
 * Pure functions, no Git dependency, so the logic is trivially unit-testable.
 * The route layer wires real file contents (read via GitService) into here.
 *
 * Approach:
 *   1. Parse each version into logical blocks (heading / paragraph / list item
 *      / code / quote).
 *   2. Align blocks with an LCS over normalized text -> equal / insert / delete.
 *   3. Collapse a delete immediately followed (or preceded) by a *similar*
 *      insert into a single "modified" block, with word-level emphasis.
 */

import type {
  InlineSegment,
  SemanticDiff,
  SemanticDiffBlock,
} from "@context-studio/types";

type BlockType = SemanticDiffBlock["blockType"];

interface ParsedBlock {
  blockType: BlockType;
  depth?: number;
  text: string;
}

/** Normalized key for a block — used for alignment and attribution lookup. */
export function blockKey(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

// ---------------------------------------------------------------------------
// Markdown block parsing (intentionally lightweight, no external dependency)
// ---------------------------------------------------------------------------

export function parseBlocks(markdown: string): ParsedBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ParsedBlock[] = [];

  let i = 0;
  let paragraph: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ blockType: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ blockType: "quote", text: quote.join(" ").trim() });
      quote = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Fenced code block: consume until the closing fence.
    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushQuote();
      const fence: string[] = [line];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        fence.push(lines[i] ?? "");
        i++;
      }
      if (i < lines.length) fence.push(lines[i] ?? ""); // closing fence
      i++;
      blocks.push({ blockType: "code", text: fence.join("\n") });
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
      flushQuote();
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushQuote();
      blocks.push({
        blockType: "heading",
        depth: heading[1]!.length,
        text: heading[2]!.trim(),
      });
      i++;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      // Each list item is its own logical block.
      flushParagraph();
      flushQuote();
      const text = trimmed.replace(/^([-*+]|\d+\.)\s+/, "").trim();
      blocks.push({ blockType: "listItem", text });
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      quote.push(trimmed.replace(/^>\s?/, ""));
      i++;
      continue;
    }

    flushQuote();
    paragraph.push(trimmed);
    i++;
  }

  flushParagraph();
  flushQuote();
  return blocks;
}

// ---------------------------------------------------------------------------
// LCS alignment
// ---------------------------------------------------------------------------

type Op =
  | { type: "equal"; a: ParsedBlock; b: ParsedBlock }
  | { type: "delete"; a: ParsedBlock }
  | { type: "insert"; b: ParsedBlock };

function lcsOps(a: ParsedBlock[], b: ParsedBlock[]): Op[] {
  const keyA = a.map((x) => blockKey(x.text));
  const keyB = b.map((x) => blockKey(x.text));
  const n = a.length;
  const m = b.length;

  // dp[i][j] = LCS length of a[i:] and b[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        keyA[i] === keyB[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (keyA[i] === keyB[j]) {
      ops.push({ type: "equal", a: a[i]!, b: b[j]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ type: "delete", a: a[i]! });
      i++;
    } else {
      ops.push({ type: "insert", b: b[j]! });
      j++;
    }
  }
  while (i < n) ops.push({ type: "delete", a: a[i++]! });
  while (j < m) ops.push({ type: "insert", b: b[j++]! });
  return ops;
}

// ---------------------------------------------------------------------------
// Word-level diff for "modified" blocks -> inline segments
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/** Word set with edge punctuation stripped, so "purchase." == "purchase,". */
function wordSet(text: string): Set<string> {
  return new Set(
    blockKey(text)
      .split(" ")
      .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
      .filter((w) => w.length > 0),
  );
}

/** Jaccard similarity over word sets — used to decide delete+insert -> modify. */
function similarity(before: string, after: string): number {
  const setA = wordSet(before);
  const setB = wordSet(after);
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

/**
 * Produce an inline segment sequence representing the transition before->after:
 * equal words plain, removed words emphasized "removed", added words "added".
 */
export function wordSegments(before: string, after: string): InlineSegment[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const segments: InlineSegment[] = [];
  const push = (text: string, emphasis?: "added" | "removed") => {
    const last = segments[segments.length - 1];
    if (last && last.emphasis === emphasis) last.text += text;
    else segments.push(emphasis ? { text, emphasis } : { text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(a[i]!);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push(a[i]!, "removed");
      i++;
    } else {
      push(b[j]!, "added");
      j++;
    }
  }
  while (i < n) push(a[i++]!, "removed");
  while (j < m) push(b[j++]!, "added");
  return segments;
}

// ---------------------------------------------------------------------------
// Top-level: compute the semantic diff
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = 0.4;

function makeId(documentPath: string, ordinal: number, text: string): string {
  // Stable-ish id from position + a short fingerprint of the text.
  const key = blockKey(text);
  let hash = 0;
  for (let k = 0; k < key.length; k++) {
    hash = (hash * 31 + key.charCodeAt(k)) >>> 0;
  }
  return `${documentPath.replace(/[^a-z0-9]+/gi, "-")}:${ordinal}:${hash.toString(36)}`;
}

export function computeSemanticDiff(
  documentPath: string,
  before: string,
  after: string,
): SemanticDiff {
  const ops = lcsOps(parseBlocks(before), parseBlocks(after));

  // Collapse adjacent delete->insert (or insert->delete) of similar blocks into
  // a single "modified" block.
  const merged: Array<
    | { kind: "equal"; b: ParsedBlock }
    | { kind: "added"; b: ParsedBlock }
    | { kind: "removed"; a: ParsedBlock }
    | { kind: "modified"; a: ParsedBlock; b: ParsedBlock }
  > = [];

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    const next = ops[k + 1];

    if (
      op.type === "delete" &&
      next?.type === "insert" &&
      similarity(op.a.text, next.b.text) >= SIMILARITY_THRESHOLD
    ) {
      merged.push({ kind: "modified", a: op.a, b: next.b });
      k++; // consume the paired insert
      continue;
    }
    if (
      op.type === "insert" &&
      next?.type === "delete" &&
      similarity(next.a.text, op.b.text) >= SIMILARITY_THRESHOLD
    ) {
      merged.push({ kind: "modified", a: next.a, b: op.b });
      k++; // consume the paired delete
      continue;
    }

    if (op.type === "equal") merged.push({ kind: "equal", b: op.b });
    else if (op.type === "insert") merged.push({ kind: "added", b: op.b });
    else merged.push({ kind: "removed", a: op.a });
  }

  const blocks: SemanticDiffBlock[] = merged.map((m, ordinal) => {
    switch (m.kind) {
      case "equal":
        return {
          id: makeId(documentPath, ordinal, m.b.text),
          kind: "unchanged",
          blockType: m.b.blockType,
          depth: m.b.depth,
          after: m.b.text,
        };
      case "added":
        return {
          id: makeId(documentPath, ordinal, m.b.text),
          kind: "added",
          blockType: m.b.blockType,
          depth: m.b.depth,
          after: m.b.text,
        };
      case "removed":
        return {
          id: makeId(documentPath, ordinal, m.a.text),
          kind: "removed",
          blockType: m.a.blockType,
          depth: m.a.depth,
          before: m.a.text,
        };
      case "modified":
        return {
          id: makeId(documentPath, ordinal, m.b.text),
          kind: "modified",
          blockType: m.b.blockType,
          depth: m.b.depth,
          before: m.a.text,
          after: m.b.text,
          segments: wordSegments(m.a.text, m.b.text),
        };
    }
  });

  const summary = blocks.reduce(
    (acc, b) => {
      if (b.kind === "added") acc.added++;
      else if (b.kind === "removed") acc.removed++;
      else if (b.kind === "modified") acc.modified++;
      return acc;
    },
    { added: 0, removed: 0, modified: 0 },
  );

  return { documentPath, blocks, summary };
}
