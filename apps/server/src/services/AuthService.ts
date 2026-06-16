/**
 * AuthService — identity + permissions (Module 7).
 *
 * Two credential types:
 *   - Human sessions: a signed (HMAC) bearer token issued at login. Pick-user
 *     login stands in for SSO; no passwords are handled. The token carries the
 *     author id, so the server derives "who is acting" from the token — a user
 *     can only act as themselves.
 *   - Agent API keys: a random key shown once, stored only as sha256. Agents
 *     present it as a bearer token on agent-submit so they can't be impersonated.
 *
 * Reads are left open (LAN-trusted); writes/merges are gated.
 */

import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "../lib/db.js";
import { SIGNING_DIR } from "../lib/config.js";

const SESSION_TTL_MS = 7 * 86_400_000;

interface SessionPayload {
  sub: string; // author id
  exp: number; // epoch ms
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export class AuthService {
  private secret: string | null = null;

  private async sessionSecret(): Promise<string> {
    if (this.secret) return this.secret;
    await fs.mkdir(SIGNING_DIR, { recursive: true });
    const p = path.join(SIGNING_DIR, "session.secret");
    try {
      this.secret = await fs.readFile(p, "utf8");
    } catch {
      this.secret = randomBytes(32).toString("hex");
      await fs.writeFile(p, this.secret, { mode: 0o600 });
    }
    return this.secret;
  }

  // --- Human sessions ----------------------------------------------------

  async createSession(authorId: string, nowMs: number): Promise<string> {
    const payload: SessionPayload = { sub: authorId, exp: nowMs + SESSION_TTL_MS };
    const body = b64url(JSON.stringify(payload));
    const sig = b64url(createHmac("sha256", await this.sessionSecret()).update(body).digest());
    return `${body}.${sig}`;
  }

  async verifySession(token: string | undefined, nowMs: number): Promise<string | null> {
    if (!token) return null;
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const want = b64url(createHmac("sha256", await this.sessionSecret()).update(body).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(want);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
      if (payload.exp < nowMs) return null;
      return payload.sub;
    } catch {
      return null;
    }
  }

  // --- Agent API keys ----------------------------------------------------

  private hashKey(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  /** Create a key for an agent; returns the raw key ONCE (never stored). */
  async createApiKey(agentId: string, label?: string): Promise<string> {
    const raw = `csk_${randomBytes(24).toString("hex")}`;
    await db.apiKey.create({
      data: { agentId, hashedKey: this.hashKey(raw), label: label ?? null },
    });
    return raw;
  }

  /** Resolve a raw bearer key to its agent id, or null. */
  async authenticateAgent(rawKey: string | undefined): Promise<string | null> {
    if (!rawKey) return null;
    const row = await db.apiKey.findUnique({ where: { hashedKey: this.hashKey(rawKey) } });
    return row?.agentId ?? null;
  }
}

/** Extract a bearer token from an Authorization header. */
export function bearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : undefined;
}
