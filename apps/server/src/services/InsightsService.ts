/**
 * InsightsService — the dashboard's "decision layer".
 *
 * Rolls each managed file's usage (sample until the MCP read-proxy is live),
 * provenance (attribution index + open agent PRs), and governance (freshness +
 * tickets) into per-file signals: what to trim, what's unreliable, what's
 * stale, what's in conflict, and what has work waiting. `sample: true` flags
 * that reads aren't live traffic yet.
 */

import type {
  FileInsight,
  FreshnessState,
  InsightFlag,
  InsightsOverview,
  SourceKind,
} from "@context-studio/types";
import type { WorkspaceContext } from "./WorkspaceManager.js";
import { MAIN_BRANCH } from "./GitService.js";
import { parseBlocks } from "./SemanticDiffService.js";
import { db } from "../lib/db.js";

const RARE_THRESHOLD = 25;
const HOT_THRESHOLD = 150;
const OPEN_PR_STATUSES = ["draft", "in_review", "changes_requested", "approved"];

const FRESH_RANK: Record<FreshnessState, number> = { conflicted: 0, expired: 1, stale: 2, fresh: 3 };

export class InsightsService {
  constructor(private readonly ctx: WorkspaceContext) {}

  async overview(): Promise<InsightsOverview> {
    const [tickets, openPrs, attributions, freshness] = await Promise.all([
      db.reviewTicket.findMany({ where: { state: "open" } }),
      db.pr.findMany({ where: { status: { in: OPEN_PR_STATUSES } } }),
      db.attributionEntry.findMany({ include: { author: true } }),
      db.blockFreshness.findMany(),
    ]);

    const kindOf = (doc: string): SourceKind => {
      const s = this.ctx.sources.find((src) => doc.includes(src.kind));
      return s?.kind ?? this.ctx.sources[0]?.kind ?? "context";
    };

    const files: FileInsight[] = [];
    for (const doc of this.ctx.documents) {
      const content = await this.ctx.git.readDocument(MAIN_BRANCH, doc);
      const blocks = parseBlocks(content);
      const headings = blocks.filter((b) => b.blockType === "heading");
      const reads = headings.reduce((s, h) => s + pseudoReads(`${doc}#${h.text}`), 0);
      const trend = Array.from({ length: 8 }, (_, i) =>
        Math.max(0, Math.round((reads / 8) * (0.55 + ((i * 17 + reads) % 45) / 100))),
      );

      // Provenance: approved = agent-authored blocks merged on main; unverified =
      // blocks still sitting in open agent PRs (not yet human-approved).
      const approved = attributions.filter((a) => a.documentPath === doc && a.author.kind === "agent").length;
      const unverified = openPrs.filter((p) => p.origin === "agent" && p.documentPath === doc).length;
      const total = blocks.length;
      const human = Math.max(0, total - approved - unverified);
      const lines = { total, human, approved, unverified };

      const docTickets = tickets.filter((t) => t.documentPath === doc || related(t.relatedPaths).includes(doc));
      const openRequests = docTickets.length + openPrs.filter((p) => p.documentPath === doc).length;
      const worst = worstFreshness(freshness.filter((f) => f.documentPath === doc).map((f) => f.state as FreshnessState));
      const conflict = docTickets.some((t) => t.type === "conflict") || worst === "conflicted";

      const flags: InsightFlag[] = [];
      if (conflict) flags.push("conflict");
      if (unverified > 0) flags.push("unverified");
      if (worst === "stale" || worst === "expired") flags.push("stale");
      if (reads === 0) flags.push("never_read");
      else if (reads < RARE_THRESHOLD) flags.push("rarely_read");
      if (openRequests > 0) flags.push("open_requests");
      if (reads >= HOT_THRESHOLD) flags.push("hot");

      files.push({
        path: doc,
        kind: kindOf(doc),
        reads,
        trend,
        lastReadAt: reads > 0 ? daysAgo(1) : undefined,
        lines,
        openRequests,
        freshness: worst,
        flags,
      });
    }
    files.sort((a, b) => b.reads - a.reads);

    return {
      periodDays: 30,
      sample: true,
      files,
      summary: {
        rarelyRead: files.filter((f) => f.flags.includes("never_read") || f.flags.includes("rarely_read")).length,
        unverified: files.filter((f) => f.flags.includes("unverified")).length,
        stale: files.filter((f) => f.flags.includes("stale")).length,
        conflicts: tickets.filter((t) => t.type === "conflict").length,
        openRequests: files.filter((f) => f.openRequests > 0).length,
      },
    };
  }
}

function pseudoReads(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const v = h % 100;
  return v < 25 ? 0 : v;
}

function worstFreshness(states: FreshnessState[]): FreshnessState | undefined {
  if (states.length === 0) return undefined;
  return states.reduce((worst, s) => (FRESH_RANK[s] < FRESH_RANK[worst] ? s : worst), "fresh" as FreshnessState);
}

function related(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}
