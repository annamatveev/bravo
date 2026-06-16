/**
 * Auth routes (Module 7).
 *
 *   GET  /api/context/auth/users  — selectable human identities (login picker)
 *   POST /api/context/auth/login  — issue a session token for an author
 *   GET  /api/context/auth/me     — resolve the current session (Bearer token)
 */

import { Router } from "express";
import { z } from "zod";
import type { LoginResponse, SessionUser } from "@context-studio/types";
import { db } from "../lib/db.js";
import { AuthService, bearer } from "../services/AuthService.js";

export function createAuthRouter(auth: AuthService): Router {
  const router = Router();

  router.get("/users", async (_req, res) => {
    const humans = await db.author.findMany({ where: { kind: "human" } });
    res.json(
      humans.map(
        (h): SessionUser => ({ id: h.id, name: h.name, role: h.role ?? undefined }),
      ),
    );
  });

  const loginSchema = z.object({ authorId: z.string().min(1) });

  router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const author = await db.author.findUnique({ where: { id: parsed.data.authorId } });
    if (!author || author.kind !== "human") {
      res.status(404).json({ error: "Unknown user." });
      return;
    }
    const token = await auth.createSession(author.id, Date.now());
    const body: LoginResponse = {
      token,
      user: { id: author.id, name: author.name, role: author.role ?? undefined },
    };
    res.json(body);
  });

  router.get("/me", async (req, res) => {
    const authorId = await auth.verifySession(bearer(req.headers.authorization), Date.now());
    if (!authorId) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const author = await db.author.findUnique({ where: { id: authorId } });
    if (!author) {
      res.status(401).json({ error: "Unknown session." });
      return;
    }
    const user: SessionUser = { id: author.id, name: author.name, role: author.role ?? undefined };
    res.json({ user });
  });

  return router;
}
