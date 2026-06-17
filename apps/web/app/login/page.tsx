"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthConfig, SessionUser } from "@context-studio/types";
import { getAuthConfig, getUsers, googleLoginUrl, login } from "@/lib/api";
import { DEMO } from "@/lib/demo";
import { setSession } from "@/lib/auth";
import { AuthorBadge } from "@/components/cpr/ui";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function LoginPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuthConfig()
      .then((cfg) => {
        setConfig(cfg);
        if (cfg.pickUserEnabled) getUsers().then(setUsers).catch(() => {});
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  async function pick(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await login(id);
      setSession({ token: res.token, user: res.user });
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <SectionLabel n={0}>Sign in</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to bravo</h1>
        <p className="text-sm text-muted">Sign in to review and authorize context changes.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      {config?.googleEnabled &&
        (DEMO ? (
          <div className="space-y-1">
            <button
              onClick={() => {
                const owner = users.find((u) => u.accessRole === "owner") ?? users[0];
                if (owner) pick(owner.id);
              }}
              disabled={busy !== null || users.length === 0}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:bg-hover disabled:opacity-50"
            >
              <GoogleG />
              Continue with Google
            </button>
            <p className="text-center text-[11px] text-muted">Demo — signs you in as a sample owner.</p>
          </div>
        ) : (
          <a
            href={googleLoginUrl}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:bg-hover"
          >
            <GoogleG />
            Continue with Google
          </a>
        ))}

      {config?.googleEnabled && config?.pickUserEnabled && (
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-line" /> or · local / dev
          <span className="h-px flex-1 bg-line" />
        </div>
      )}

      {config?.pickUserEnabled && (
        <div>
          <p className="mb-2 text-xs text-muted">
            Pick-user login (no passwords) — a stand-in for SSO in local/dev. The server derives
            who you are from the issued token.
          </p>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {users.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted">No users found.</div>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => pick(u.id)}
                  disabled={busy !== null}
                  className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-hover disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <AuthorBadge author={{ id: u.id, kind: "human", name: u.name, role: u.role }} />
                    <span className="rounded bg-surface2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      {u.accessRole}
                    </span>
                  </div>
                  <span className="text-sm text-brand">
                    {busy === u.id ? "Signing in…" : "Sign in →"}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {config && !config.googleEnabled && !config.pickUserEnabled && (
        <p className="text-sm text-muted">No sign-in method is configured on the server.</p>
      )}
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
