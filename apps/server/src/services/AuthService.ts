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
import type { AccessRole } from "@context-studio/types";
import { db } from "../lib/db.js";
import {
  DEFAULT_ROLE,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  OWNER_EMAILS,
  SIGNING_DIR,
} from "../lib/config.js";

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

  // --- Google SSO (OIDC authorization-code flow) -------------------------

  /** The Google consent URL to redirect the browser to. */
  googleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange the auth code for tokens and read the verified identity from the
   * id_token. The exchange happens server-to-server over TLS directly with
   * Google, so the id_token payload is trusted without separate JWKS checks.
   */
  async exchangeGoogleCode(code: string): Promise<{ email: string; name: string }> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
    const tokens = (await res.json()) as { id_token?: string };
    if (!tokens.id_token) throw new Error("No id_token from Google");
    const payloadB64 = tokens.id_token.split(".")[1] ?? "";
    const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as {
      email?: string;
      name?: string;
    };
    if (!claims.email) throw new Error("Google id_token missing email");
    return { email: claims.email.toLowerCase(), name: claims.name ?? claims.email };
  }

  /** Upsert the signed-in Google user and assign a role per the allowlist. */
  async resolveGoogleUser(params: { email: string; name: string }): Promise<{ id: string }> {
    const { email, name } = params;
    const accessRole: AccessRole = OWNER_EMAILS.includes(email)
      ? "owner"
      : (DEFAULT_ROLE as AccessRole);
    const id = `g:${email}`;
    await db.author.upsert({
      where: { id },
      update: { name, email, kind: "human" },
      // Don't downgrade an existing owner on re-login; only set role on create.
      create: { id, name, email, kind: "human", accessRole, role: "Context Owner" },
    });
    // Promote to owner if newly added to the allowlist.
    if (accessRole === "owner") {
      await db.author.update({ where: { id }, data: { accessRole: "owner" } });
    }
    return { id };
  }

  // --- Authorization -----------------------------------------------------

  /** Resolve the acting human from a session token, with their access role. */
  async authenticate(
    token: string | undefined,
    nowMs: number,
  ): Promise<{ id: string; name: string; accessRole: AccessRole } | null> {
    const authorId = await this.verifySession(token, nowMs);
    if (!authorId) return null;
    const author = await db.author.findUnique({ where: { id: authorId } });
    if (!author || author.kind !== "human") return null;
    return { id: author.id, name: author.name, accessRole: author.accessRole as AccessRole };
  }
}

/** Extract a bearer token from an Authorization header. */
export function bearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : undefined;
}
