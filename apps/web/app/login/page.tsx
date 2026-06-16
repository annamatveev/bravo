"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@context-studio/types";
import { getUsers, login } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { AuthorBadge } from "@/components/cpr/ui";

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsers().then(setUsers).catch((e) => setError(String(e.message ?? e)));
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
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Choose your identity. (A pick-user login stands in for SSO in this prototype — no
          passwords are handled. The server derives who you are from the issued session token.)
        </p>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        {users.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">No users found.</div>
        ) : (
          users.map((u) => (
            <button
              key={u.id}
              onClick={() => pick(u.id)}
              disabled={busy !== null}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-black/[0.02] disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <AuthorBadge author={{ id: u.id, kind: "human", name: u.name, role: u.role }} />
                {u.role && <span className="text-xs text-muted">{u.role}</span>}
              </div>
              <span className="text-sm text-indigo-600">{busy === u.id ? "Signing in…" : "Sign in →"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
