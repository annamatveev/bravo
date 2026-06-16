"use client";

import { useEffect, useState } from "react";
import { getHealth, listContextPrs, listTickets } from "@/lib/api";

/** Live count of items needing attention, shown on the Inbox nav link. */
export function InboxBadge() {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getHealth(), listContextPrs(), listTickets()])
      .then(([h, prs, tickets]) => {
        const openCRs = prs.filter((p) => !["merged", "rejected"].includes(p.status)).length;
        const neverRead = h.cold.filter((c) => c.reads === 0).length;
        setN(openCRs + tickets.length + h.missing.length + neverRead);
      })
      .catch(() => {});
  }, []);

  if (!n) return null;
  return (
    <span
      className="ml-1.5 rounded-full px-1.5 text-[10px] font-semibold"
      style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
    >
      {n}
    </span>
  );
}
