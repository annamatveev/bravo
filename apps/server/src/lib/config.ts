import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/server root (two levels up from src/lib).
export const SERVER_ROOT = path.resolve(__dirname, "..", "..");

export const PORT = Number(process.env.PORT ?? 4000);

export const CONTEXT_REPO_DIR = path.resolve(
  SERVER_ROOT,
  process.env.CONTEXT_REPO_DIR ?? ".context-repo",
);

// --- Freshness / governance (Module 4) -----------------------------------

/** Default Time-To-Live for a context block before it is flagged stale. */
export const DEFAULT_TTL_DAYS = Number(process.env.CONTEXT_TTL_DAYS ?? 90);

/** Grace period after going stale before a block is considered expired. */
export const EXPIRED_GRACE_DAYS = Number(process.env.CONTEXT_EXPIRED_GRACE_DAYS ?? 30);

/** How often the TTL worker re-evaluates freshness (ms). */
export const WORKER_INTERVAL_MS = Number(process.env.CONTEXT_WORKER_INTERVAL_MS ?? 20_000);

// --- Distribution / signing (Module 6) -----------------------------------

/** Where signed per-agent context bundles are published (the channel). */
export const DIST_DIR = path.resolve(
  SERVER_ROOT,
  process.env.CONTEXT_DIST_DIR ?? ".dist",
);

/** Where the ed25519 signing keypair is stored (private key, gitignored). */
export const SIGNING_DIR = path.resolve(
  SERVER_ROOT,
  process.env.CONTEXT_SIGNING_DIR ?? ".signing",
);

// --- Notifications (Module 9) --------------------------------------------

/** Optional outbound webhook for events. A Slack incoming-webhook URL works. */
export const WEBHOOK_URL = process.env.CONTEXT_WEBHOOK_URL ?? "";

// --- Auth / SSO / roles (Module 10) --------------------------------------

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
/** OAuth redirect URI — must match the one registered in Google Cloud. */
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:4000/api/context/auth/google/callback";
/** Where to send the browser after a successful SSO round-trip. */
export const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://localhost:3000";

/** Emails that are granted the Owner role on sign-in (comma-separated). */
export const OWNER_EMAILS = (process.env.CONTEXT_OWNER_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Role assigned to a signed-in user who is not an owner. */
export const DEFAULT_ROLE = process.env.CONTEXT_DEFAULT_ROLE ?? "reviewer";

export const GOOGLE_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

/** Allow the local pick-user login (dev fallback). Off in production w/ SSO. */
export const PICK_USER_LOGIN =
  (process.env.CONTEXT_PICK_USER_LOGIN ?? (GOOGLE_ENABLED ? "false" : "true")) === "true";
