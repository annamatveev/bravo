/**
 * Suggestions route — the triage-agent feedback API.
 *
 *   POST /api/context/suggestions
 *
 * A triage agent (or any external quality check) calls this to file an
 * improvement request: a conflict between two files, confusing phrasing, a
 * mismatch, redundant text, etc. It lands in the human Inbox as a review
 * ticket — bravo never auto-edits; a human always reviews and decides.
 */

import { Router } from "express";
import type { CreateSuggestionBody, TicketType } from "@context-studio/types";
import { FreshnessService } from "../services/FreshnessService.js";
import type { WorkspaceManager } from "../services/WorkspaceManager.js";

const TICKET_TYPES: TicketType[] = ["freshness", "conflict", "phrasing", "mismatch", "redundancy", "other"];

export function createSuggestionsRouter(wm: WorkspaceManager): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const ctx = wm.current();
    if (!ctx) {
      res.status(409).json({ error: "No workspace configured.", code: "NO_WORKSPACE" });
      return;
    }

    const body = req.body as Partial<CreateSuggestionBody>;
    if (!body || typeof body.documentPath !== "string" || typeof body.reason !== "string") {
      res.status(400).json({ error: "documentPath and reason are required." });
      return;
    }
    if (!body.type || !TICKET_TYPES.includes(body.type)) {
      res.status(400).json({ error: `type must be one of: ${TICKET_TYPES.join(", ")}.` });
      return;
    }
    if (body.relatedPaths && !Array.isArray(body.relatedPaths)) {
      res.status(400).json({ error: "relatedPaths must be an array of paths." });
      return;
    }

    try {
      const ticket = await new FreshnessService(ctx.git).createSuggestion({
        type: body.type,
        documentPath: body.documentPath,
        blockText: body.blockText,
        reason: body.reason,
        relatedPaths: body.relatedPaths,
        agentId: body.agentId,
        agentName: body.agentName,
      });
      res.status(201).json(ticket);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create suggestion." });
    }
  });

  return router;
}
