/**
 * Auth routes (Module 7 + 10: Google SSO & roles).
 *
 *   GET  /api/context/auth/config          — what login methods are available
 *   GET  /api/context/auth/users           — pick-user list (dev fallback only)
 *   POST /api/context/auth/login           — issue a session for an author (dev)
 *   GET  /api/context/auth/me              — resolve the current session + role
 *   GET  /api/context/auth/google/login    — start the Google OIDC flow
 *   GET  /api/context/auth/google/callback — finish it, redirect to the web app
 */

import { Router } from "express";
import { z } from "zod";
import type { AuthConfig, LoginResponse, SessionUser } from "@context-studio/types";
import { db } from "../lib/db.js";
import { GOOGLE_ENABLED, PICK_USER_LOGIN, WEB_BASE_URL } from "../lib/config.js";
import { AuthService, bearer } from "../services/AuthService.js";

export function createAuthRouter(auth: AuthService): Router {
  const router = Router();

  router.get("/config", (_req, res) => {
    const cfg: AuthConfig = { googleEnabled: GOOGLE_ENABLED, pickUserEnabled: PICK_USER_LOGIN };
    res.json(cfg);
  });

  // --- Google SSO --------------------------------------------------------
  router.get("/google/login", async (_req, res) => {
    if (!GOOGLE_ENABLED) {
      res.status(404).json({ error: "Google SSO is not configured." });
      return;
    }
    // Signed, expiring state token (CSRF guard) — no server-side storage needed.
    const state = await auth.createSession("oauth-state", Date.now());
    res.redirect(auth.googleAuthUrl(state));
  });

  router.get("/google/callback", async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const stateSub = await auth.verifySession(state, Date.now());
    if (!GOOGLE_ENABLED || !code || stateSub !== "oauth-state") {
      res.status(400).send("Invalid SSO callback.");
      return;
    }
    try {
      const profile = await auth.exchangeGoogleCode(code);
      const { id } = await auth.resolveGoogleUser(profile);
      const token = await auth.createSession(id, Date.now());
      // Hand the token to the web app via the URL fragment (not query → not logged).
      res.redirect(`${WEB_BASE_URL}/auth/callback#token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error("[auth] google callback failed:", err);
      res.status(502).send("Google sign-in failed.");
    }
  });

  // --- Current session ---------------------------------------------------
  router.get("/me", async (req, res) => {
    const me = await auth.authenticate(bearer(req.headers.authorization), Date.now());
    if (!me) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const author = await db.author.findUnique({ where: { id: me.id } });
    const user: SessionUser = {
      id: me.id,
      name: me.name,
      role: author?.role ?? undefined,
      accessRole: me.accessRole,
    };
    res.json({ user });
  });

  // --- Pick-user login (dev / no-SSO fallback) ---------------------------
  router.get("/users", async (_req, res) => {
    if (!PICK_USER_LOGIN) {
      res.status(403).json({ error: "Pick-user login is disabled." });
      return;
    }
    const humans = await db.author.findMany({ where: { kind: "human" } });
    res.json(
      humans.map(
        (h): SessionUser => ({
          id: h.id,
          name: h.name,
          role: h.role ?? undefined,
          accessRole: h.accessRole as SessionUser["accessRole"],
        }),
      ),
    );
  });

  const loginSchema = z.object({ authorId: z.string().min(1) });

  router.post("/login", async (req, res) => {
    if (!PICK_USER_LOGIN) {
      res.status(403).json({ error: "Pick-user login is disabled; use Google SSO." });
      return;
    }
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
      user: {
        id: author.id,
        name: author.name,
        role: author.role ?? undefined,
        accessRole: author.accessRole as SessionUser["accessRole"],
      },
    };
    res.json(body);
  });

  return router;
}
