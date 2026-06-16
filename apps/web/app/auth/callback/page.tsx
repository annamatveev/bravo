"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { setSession } from "@/lib/auth";

/**
 * SSO landing page. The server redirects here with the session token in the URL
 * fragment (#token=…); we resolve the session and store it, then go home.
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!token) {
      setError("No session token in the callback URL.");
      return;
    }
    getMe(token)
      .then((user) => {
        setSession({ token, user });
        router.replace("/");
        router.refresh();
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [router]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {error ? (
        <>
          <h1 className="text-lg font-semibold text-rose-600">Sign-in failed</h1>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <a href="/login" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
            Back to sign in
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">Signing you in…</p>
      )}
    </div>
  );
}
