import { describe, expect, it } from "vitest";
import {
  computeSemanticDiff,
  parseBlocks,
  wordSegments,
} from "./SemanticDiffService.js";

describe("parseBlocks", () => {
  it("splits headings, paragraphs and list items into logical blocks", () => {
    const md = `# Title

A paragraph here.

## Section

- first item
- second item
`;
    const blocks = parseBlocks(md);
    expect(blocks.map((b) => b.blockType)).toEqual([
      "heading",
      "paragraph",
      "heading",
      "listItem",
      "listItem",
    ]);
    expect(blocks[0]).toMatchObject({ blockType: "heading", depth: 1, text: "Title" });
  });
});

describe("computeSemanticDiff", () => {
  const before = `# Policy

Refundable within 30 days.

## Eligibility

Must be unused.
`;

  it("marks an untouched document as fully unchanged", () => {
    const diff = computeSemanticDiff("p.md", before, before);
    expect(diff.summary).toEqual({ added: 0, removed: 0, modified: 0 });
    expect(diff.blocks.every((b) => b.kind === "unchanged")).toBe(true);
  });

  it("detects an added block", () => {
    const after = before + "\nRefunds go to the original payment method.\n";
    const diff = computeSemanticDiff("p.md", before, after);
    expect(diff.summary.added).toBe(1);
    expect(diff.blocks.find((b) => b.kind === "added")?.after).toContain(
      "original payment method",
    );
  });

  it("detects a modified block and produces inline segments", () => {
    const after = before.replace("within 30 days", "within 14 days");
    const diff = computeSemanticDiff("p.md", before, after);
    expect(diff.summary.modified).toBe(1);
    const mod = diff.blocks.find((b) => b.kind === "modified");
    expect(mod?.segments?.some((s) => s.emphasis === "added")).toBe(true);
    expect(mod?.segments?.some((s) => s.emphasis === "removed")).toBe(true);
  });

  it("detects a removed block", () => {
    const after = before.replace("\nMust be unused.\n", "\n");
    const diff = computeSemanticDiff("p.md", before, after);
    expect(diff.summary.removed).toBe(1);
  });
});

describe("wordSegments", () => {
  it("emphasizes changed words while keeping shared words plain", () => {
    const segs = wordSegments("refundable within 30 days", "refundable within 14 days");
    const plain = segs.filter((s) => !s.emphasis).map((s) => s.text).join("");
    expect(plain).toContain("refundable");
    expect(segs.some((s) => s.emphasis === "added" && s.text.includes("14"))).toBe(true);
    expect(segs.some((s) => s.emphasis === "removed" && s.text.includes("30"))).toBe(true);
  });
});
