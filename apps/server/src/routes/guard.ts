/**
 * Permission guard shared by the mutating routes (Module 10).
 * Resolves the acting human from the session and enforces their access role.
 */

import type { Request, Response } from "express";
import { type Permission, can } from "@context-studio/types";
import { AuthService, bearer } from "../services/AuthService.js";

export async function requirePermission(
  auth: AuthService,
  req: Request,
  res: Response,
  permission: Permission,
): Promise<{ id: string; name: string; accessRole: "owner" | "reviewer" | "viewer" } | null> {
  const me = await auth.authenticate(bearer(req.headers.authorization), Date.now());
  if (!me) {
    res.status(401).json({ error: "Sign in required.", code: "AUTH_REQUIRED" });
    return null;
  }
  if (!can(me.accessRole, permission)) {
    res.status(403).json({
      error: `Your role (${me.accessRole}) is not allowed to ${permission}.`,
      code: "FORBIDDEN",
    });
    return null;
  }
  return me;
}
