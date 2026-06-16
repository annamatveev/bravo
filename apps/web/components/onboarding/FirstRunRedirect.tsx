"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** First-time visitors are sent to the onboarding page (/welcome) once. */
export function FirstRunRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (localStorage.getItem("bravo.onboarded") !== "1") router.replace("/welcome");
    } catch {
      /* ignore */
    }
  }, [router]);
  return null;
}
