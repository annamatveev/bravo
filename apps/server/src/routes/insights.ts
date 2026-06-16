/**
 * Insights route.
 *
 *   GET /api/context/insights — per-file usage + provenance + governance signals
 */

import { Router } from "express";
import { InsightsService } from "../services/InsightsService.js";
import type { WorkspaceManager } from "../services/WorkspaceManager.js";

export function createInsightsRouter(wm: WorkspaceManager): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const ctx = wm.current();
    if (!ctx) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }
    try {
      res.json(await new InsightsService(ctx).overview());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load insights." });
    }
  });

  return router;
}
