/**
 * Distribution routes (Module 6).
 *
 *   GET  /api/context/distribution         — current published bundle status
 *   POST /api/context/distribution/publish — (re)publish signed per-agent slices
 */

import { Router } from "express";
import { DistributionService } from "../services/DistributionService.js";
import type { SigningService } from "../services/SigningService.js";
import type { WorkspaceManager } from "../services/WorkspaceManager.js";
import type { AuthService } from "../services/AuthService.js";
import { requirePermission } from "./guard.js";

export function createDistributionRouter(
  wm: WorkspaceManager,
  signing: SigningService,
  auth: AuthService,
): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const ctx = wm.current();
    if (!ctx) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }
    try {
      res.json(await new DistributionService(ctx, signing).status());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to read distribution status." });
    }
  });

  router.post("/publish", async (req, res) => {
    const me = await requirePermission(auth, req, res, "publish");
    if (!me) return;
    const ctx = wm.current();
    if (!ctx) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }
    try {
      const status = await new DistributionService(ctx, signing).publish(
        new Date().toISOString(),
      );
      res.json(status);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to publish context bundle." });
    }
  });

  return router;
}
