/**
 * History routes — version control for the UI.
 *
 *   GET /api/context/history?path=…        — a file's chain of merges
 *   GET /api/context/history/line?path&block — one line's edit history
 *
 * Built from the merged Context PRs and the attribution index (no Git
 * vocabulary leaks out — the UI just sees a chain of changes).
 */

import { Router } from "express";
import type { HistoryEvent } from "@context-studio/types";
import { db } from "../lib/db.js";
import { blockKey } from "../services/SemanticDiffService.js";
import type { WorkspaceManager } from "../services/WorkspaceManager.js";

export function createHistoryRouter(wm: WorkspaceManager): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    if (!wm.current()) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }
    const path = String(req.query.path ?? "");
    const prs = await db.pr.findMany({
      where: { documentPath: path, status: "merged" },
      include: { author: true },
      orderBy: { updatedAt: "desc" },
    });
    const events: HistoryEvent[] = prs.map((p) => ({
      id: p.id,
      type: "merge",
      date: p.updatedAt.toISOString(),
      title: p.title,
      authorName: p.author.name,
      authorKind: p.author.kind as "human" | "agent",
      prId: p.id,
    }));
    res.json({ path, events });
  });

  router.get("/line", async (req, res) => {
    if (!wm.current()) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }
    const path = String(req.query.path ?? "");
    const block = String(req.query.block ?? "");
    const entry = await db.attributionEntry.findFirst({
      where: { documentPath: path, blockKey: blockKey(block) },
      include: { author: true },
    });
    const events: HistoryEvent[] = entry
      ? [
          {
            id: entry.id,
            type: "merge",
            date: entry.mergedAt.toISOString(),
            title: entry.prTitle,
            authorName: entry.author.name,
            authorKind: entry.author.kind as "human" | "agent",
            prId: entry.prId,
          },
        ]
      : [];
    res.json(events);
  });

  return router;
}
