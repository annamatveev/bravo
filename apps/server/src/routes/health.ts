/**
 * Health route — the agent "health" overview for the main dashboard.
 *   GET /api/context/health
 */

import { Router } from "express";
import { HealthService } from "../services/HealthService.js";
import type { WorkspaceManager } from "../services/WorkspaceManager.js";

export function createHealthRouter(wm: WorkspaceManager): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const ctx = wm.current();
    if (!ctx) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }
    try {
      res.json(await new HealthService(ctx).overview());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to build health overview." });
    }
  });

  return router;
}
