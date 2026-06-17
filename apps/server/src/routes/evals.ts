/**
 * Evals config routes.
 *
 *   GET   /api/context/evals       — eval definitions, grouped per source
 *   PATCH /api/context/evals/:id   — toggle/edit a definition
 *
 * These are the per-source merge gate: a `required` eval must pass before a
 * change to that source can merge. (The run itself is /api/context/pr/:id/evals.)
 */

import { Router } from "express";
import type { EvalDefinition, SourceKind } from "@context-studio/types";
import type { WorkspaceManager } from "../services/WorkspaceManager.js";

function sourceOf(docPath: string | undefined): SourceKind {
  const top = docPath?.split("/")[0] ?? "context";
  return ["context", "skills", "memory"].includes(top) ? top : "context";
}

export function createEvalsRouter(wm: WorkspaceManager): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const ctx = wm.current();
    if (!ctx) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }
    const definitions: EvalDefinition[] = ctx.evals.map((ev) => {
      const agent = ctx.agents.find((a) => a.id === ev.agentId);
      return {
        id: ev.id,
        source: sourceOf(agent?.reads?.[0]),
        name: ev.question ?? ev.id,
        question: ev.question,
        expectContains: ev.expectContains,
        expectNotContains: ev.expectNotContains,
        required: true,
        lastStatus: "unknown",
      };
    });
    res.json({ definitions });
  });

  router.patch("/:id", (_req, res) => {
    // Eval config isn't persisted server-side in this prototype.
    res.json({ ok: true });
  });

  return router;
}
