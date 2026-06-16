/**
 * FreshnessService — the governance state machine (Module 4).
 *
 * Every context block on main has a freshness record. This service:
 *   - recomputes each block's state (fresh → stale → expired) from its TTL;
 *   - marks blocks `conflicted` when two or more open Context PRs touch them;
 *   - auto-opens a review ticket (routed to the Context Owner) when a block
 *     needs attention.
 *
 * The TTL worker (worker.ts) calls evaluate() on an interval; the read methods
 * back the governance UI.
 */

import type {
  BlockFreshness as DomainFreshness,
  CreateSuggestionBody,
  FreshnessOverview,
  FreshnessState,
  ReviewTicket,
  SuggestionSource,
  TicketType,
} from "@context-studio/types";
import { db } from "../lib/db.js";
import { EXPIRED_GRACE_DAYS } from "../lib/config.js";
import { notify } from "../lib/notify.js";
import { GitService, MAIN_BRANCH } from "./GitService.js";
import { blockKey, computeSemanticDiff } from "./SemanticDiffService.js";

const OPEN_PR_STATUSES = ["draft", "in_review", "changes_requested", "approved"];
const TTL_REASON = (ttlDays: number) => `Block is past its ${ttlDays}-day review window.`;
const CONFLICT_REASON = "Modified by two or more open change requests.";

const ATTENTION_RANK: Record<FreshnessState, number> = {
  conflicted: 0,
  expired: 1,
  stale: 2,
  fresh: 3,
};

/** Parse the stored JSON `relatedPaths` column back into an array. */
function parseRelated(raw: string | null | undefined): string[] | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

export class FreshnessService {
  constructor(private readonly git: GitService) {}

  /** Recompute every block's state and open tickets where needed. */
  async evaluate(): Promise<{ transitioned: number; ticketsOpened: number }> {
    const now = Date.now();
    const blocks = await db.blockFreshness.findMany();
    const conflicted = await this.detectConflictedBlocks();
    const owner = await db.author.findFirst({ where: { kind: "human" } });

    let transitioned = 0;
    let ticketsOpened = 0;

    for (const b of blocks) {
      const staleAtMs = b.staleAt.getTime();
      const expiredAtMs = staleAtMs + EXPIRED_GRACE_DAYS * 86_400_000;
      const ckey = `${b.documentPath}::${b.blockKey}`;

      let state: FreshnessState;
      if (conflicted.has(ckey)) state = "conflicted";
      else if (now >= expiredAtMs) state = "expired";
      else if (now >= staleAtMs) state = "stale";
      else state = "fresh";

      if (state !== b.state) {
        await db.blockFreshness.update({ where: { id: b.id }, data: { state } });
        transitioned++;
      }

      if (state !== "fresh") {
        const reason = state === "conflicted" ? CONFLICT_REASON : TTL_REASON(b.ttlDays);
        const existing = await db.reviewTicket.findUnique({
          where: {
            documentPath_blockKey_reason: {
              documentPath: b.documentPath,
              blockKey: b.blockKey,
              reason,
            },
          },
        });
        if (!existing) {
          await db.reviewTicket.create({
            data: {
              documentPath: b.documentPath,
              blockKey: b.blockKey,
              blockText: b.text,
              reason,
              type: state === "conflicted" ? "conflict" : "freshness",
              source: "system",
              assigneeId: owner?.id ?? null,
            },
          });
          ticketsOpened++;
          void notify({ kind: "ticket_opened", documentPath: b.documentPath, reason });
        }
      }
    }

    return { transitioned, ticketsOpened };
  }

  /** Blocks touched (modified/removed) by 2+ open PRs → conflicted. */
  private async detectConflictedBlocks(): Promise<Set<string>> {
    const open = await db.pr.findMany({
      where: { status: { in: OPEN_PR_STATUSES } },
    });
    const counts = new Map<string, number>();

    for (const pr of open) {
      const before = await this.git.readDocument(MAIN_BRANCH, pr.documentPath);
      const after = await this.git.readDocument(pr.draftBranch, pr.documentPath);
      if (!after) continue;
      const diff = computeSemanticDiff(pr.documentPath, before, after);

      const touched = new Set<string>();
      for (const block of diff.blocks) {
        if (block.kind === "modified" || block.kind === "removed") {
          touched.add(`${pr.documentPath}::${blockKey(block.before ?? "")}`);
        }
      }
      for (const k of touched) counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    return new Set([...counts].filter(([, c]) => c >= 2).map(([k]) => k));
  }

  async getOverview(): Promise<FreshnessOverview> {
    const blocks = await db.blockFreshness.findMany();
    const counts: Record<FreshnessState, number> = {
      fresh: 0,
      stale: 0,
      expired: 0,
      conflicted: 0,
    };
    for (const b of blocks) counts[b.state as FreshnessState]++;

    const attention = blocks
      .filter((b) => b.state !== "fresh")
      .sort(
        (a, b) =>
          ATTENTION_RANK[a.state as FreshnessState] -
          ATTENTION_RANK[b.state as FreshnessState],
      )
      .map((b) => this.toDomain(b));

    return { counts, attention, total: blocks.length };
  }

  async listTickets(): Promise<ReviewTicket[]> {
    const tickets = await db.reviewTicket.findMany({
      where: { state: "open" },
      orderBy: { createdAt: "desc" },
    });
    const assignees = await db.author.findMany();
    const byId = new Map(assignees.map((a) => [a.id, a]));

    return tickets.map((t): ReviewTicket => {
      const a = t.assigneeId ? byId.get(t.assigneeId) : undefined;
      return {
        id: t.id,
        documentPath: t.documentPath,
        blockKey: t.blockKey,
        blockText: t.blockText,
        reason: t.reason,
        state: t.state as ReviewTicket["state"],
        createdAt: t.createdAt.toISOString(),
        assignee: a
          ? { id: a.id, kind: a.kind as "human" | "agent", name: a.name, role: a.role ?? undefined }
          : undefined,
        type: (t.type as TicketType) ?? "freshness",
        source: (t.source as SuggestionSource) ?? "system",
        relatedPaths: parseRelated(t.relatedPaths),
        raisedBy: t.raisedBy ?? undefined,
      };
    });
  }

  /**
   * Raise an improvement suggestion (the triage-agent feedback API). Lands in
   * the human Inbox as a ticket — bravo never auto-edits.
   */
  async createSuggestion(body: CreateSuggestionBody): Promise<ReviewTicket> {
    const owner = await db.author.findFirst({ where: { kind: "human" } });
    const blockText = body.blockText ?? "";
    const key = blockText ? blockKey(blockText) : `suggestion:${body.type}`;
    const created = await db.reviewTicket.upsert({
      where: {
        documentPath_blockKey_reason: {
          documentPath: body.documentPath,
          blockKey: key,
          reason: body.reason,
        },
      },
      update: {},
      create: {
        documentPath: body.documentPath,
        blockKey: key,
        blockText,
        reason: body.reason,
        type: body.type,
        source: "agent",
        relatedPaths: body.relatedPaths?.length ? JSON.stringify(body.relatedPaths) : null,
        raisedBy: body.agentName ?? body.agentId ?? "Triage Agent",
        assigneeId: owner?.id ?? null,
      },
    });
    void notify({ kind: "ticket_opened", documentPath: body.documentPath, reason: body.reason });
    return {
      id: created.id,
      documentPath: created.documentPath,
      blockKey: created.blockKey,
      blockText: created.blockText,
      reason: created.reason,
      state: created.state as ReviewTicket["state"],
      createdAt: created.createdAt.toISOString(),
      assignee: owner ? { id: owner.id, kind: "human", name: owner.name, role: owner.role ?? undefined } : undefined,
      type: created.type as TicketType,
      source: created.source as SuggestionSource,
      relatedPaths: parseRelated(created.relatedPaths),
      raisedBy: created.raisedBy ?? undefined,
    };
  }

  private toDomain(b: {
    documentPath: string;
    blockKey: string;
    text: string;
    state: string;
    lastReviewedAt: Date;
    ttlDays: number;
    staleAt: Date;
  }): DomainFreshness {
    return {
      documentPath: b.documentPath,
      blockKey: b.blockKey,
      text: b.text,
      state: b.state as FreshnessState,
      lastReviewedAt: b.lastReviewedAt.toISOString(),
      ttlDays: b.ttlDays,
      staleAt: b.staleAt.toISOString(),
    };
  }
}
