"use client";

import type { SessionUser } from "@context-studio/types";

const KEY = "cs.session";

export interface StoredSession {
  token: string;
  user: SessionUser;
}

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: StoredSession): void {
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  window.localStorage.removeItem(KEY);
}

/** Authorization header for gated mutations, or empty when not signed in. */
export function authHeaders(): Record<string, string> {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}
