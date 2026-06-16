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
      <Link href="/login" className="rounded-md px-2.5 py-1 text-sm font-medium text-indigo-600 hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">{user.name}</span>
      <button
        onClick={() => {
          clearSession();
          setUser(null);
          router.refresh();
        }}
        className="rounded-md px-2 py-1 text-xs text-muted hover:bg-hover hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
