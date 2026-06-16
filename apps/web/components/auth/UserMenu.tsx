"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@context-studio/types";
import { clearSession, getSession } from "@/lib/auth";

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getSession()?.user ?? null);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-medium text-brand hover:underline"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
      <span className="text-muted">{user.name}</span>
      <span className="rounded bg-surface2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
        {user.accessRole}
      </span>
      <button
        onClick={() => {
          clearSession();
          setUser(null);
          router.refresh();
        }}
        className="whitespace-nowrap rounded-md px-2 py-1 text-xs text-muted hover:bg-hover hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
