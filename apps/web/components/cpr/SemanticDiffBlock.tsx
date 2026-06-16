"use client";

import { useState } from "react";
import Link from "next/link";
import type { SemanticDiffBlock as Block } from "@context-studio/types";
import { AuthorBadge, relativeTime } from "./ui";

const RAIL: Record<Block["kind"], string> = {
  added: "border-l-added-accent bg-added-accent/10",
  removed: "border-l-removed-accent bg-removed-accent/10",
  modified: "border-l-modified-accent bg-modified-accent/10",
  unchanged: "border-l-transparent bg-transparent",
};

const TAG: Record<Block["kind"], { label: string; className: string } | null> = {
  added: { label: "Added", className: "bg-added-accent/10 text-added-accent" },
  removed: { label: "Removed", className: "bg-removed-accent/10 text-removed-accent" },
  modified: { label: "Edited", className: "bg-modified-accent/10 text-modified-accent" },
  unchanged: null,
};

/** Render the text of a block, with word-level emphasis for modified blocks. */
function BlockText({ block }: { block: Block }) {
  const base = "leading-relaxed";

  if (block.kind === "modified" && block.segments) {
    return (
      <p className={base}>
        {block.segments.map((seg, i) => {
          if (seg.emphasis === "added")
            return (
              <span key={i} className="rounded bg-added-inline px-0.5 text-added-accent">
                {seg.text}
              </span>
            );
          if (seg.emphasis === "removed")
            return (
              <span key={i} className="rounded bg-removed-inline px-0.5 text-removed-accent line-through decoration-removed-accent/60">
                {seg.text}
              </span>
            );
          return <span key={i}>{seg.text}</span>;
        })}
      </p>
    );
  }

  const text = block.after ?? block.before ?? "";
  const cls =
    block.kind === "removed"
      ? `${base} text-removed-accent line-through decoration-removed-accent/50`
      : base;
  return <p className={cls}>{text}</p>;
}

/** Typographic wrapper so headings/list items read like a document, not a form. */
function Typographic({ block, children }: { block: Block; children: React.ReactNode }) {
  if (block.blockType === "heading") {
    const size = (block.depth ?? 1) <= 1 ? "text-xl font-semibold" : "text-lg font-semibold";
    return <div className={size}>{children}</div>;
  }
  if (block.blockType === "listItem") {
    return (
      <div className="flex gap-2">
        <span aria-hidden className="select-none text-muted">•</span>
        <div className="flex-1">{children}</div>
      </div>
    );
  }
  if (block.blockType === "code") {
    return <pre className="overflow-x-auto rounded bg-slate-900/90 p-3 text-sm text-slate-100">{children}</pre>;
  }
  if (block.blockType === "quote") {
    return <blockquote className="border-l-2 border-line pl-3 italic text-muted">{children}</blockquote>;
  }
  return <div>{children}</div>;
}

export function SemanticDiffBlock({ block }: { block: Block }) {
  const [hovered, setHovered] = useState(false);
  const tag = TAG[block.kind];
  const attribution = block.attribution;

  return (
    <div
      className={`group relative border-l-[3px] py-2 pl-4 pr-3 transition-colors ${RAIL[block.kind]}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {tag && (
        <span
          className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tag.className}`}
        >
          {tag.label}
        </span>
      )}

      <Typographic block={block}>
        <BlockText block={block} />
      </Typographic>

      {/* Attribution Gutter: a non-technical `git blame`, on hover. */}
      {attribution && hovered && (
        <div className="absolute left-4 z-10 mt-1 w-72 rounded-lg border border-line bg-surface p-3 text-xs shadow-lg">
          <div className="mb-1.5 flex items-center gap-1.5 text-muted">
            <span>Authored by</span>
            <AuthorBadge author={attribution.author} />
          </div>
          <div className="text-muted">
            {attribution.prTitle.endsWith("(proposed)") ? "Proposed in this request" : "Merged"} ·{" "}
            {relativeTime(attribution.mergedAt)}
          </div>
          <Link
            href={`/pr/${attribution.prId}`}
            className="mt-1.5 inline-block font-medium text-brand hover:underline"
          >
            {attribution.prTitle.replace(" (proposed)", "")} ({attribution.prId}) →
          </Link>
        </div>
      )}
    </div>
  );
}
