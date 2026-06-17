import { getHealth, listContextPrs, listTickets } from "@/lib/api";
import { ReviewQueue, type QueueItem } from "@/components/queue/ReviewQueue";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export default async function QueuePage() {
  let prs;
  let tickets;
  let health;
  try {
    [prs, tickets, health] = await Promise.all([listContextPrs(), listTickets(), getHealth()]);
  } catch {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h1 className="text-lg font-semibold text-amber-900 dark:text-amber-200">Couldn’t reach the backend</h1>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Start the server and reload.</p>
      </div>
    );
  }

  const items: QueueItem[] = [];
  const sn = (p: string) => p.split("/").slice(1).join("/") || p;

  for (const pr of prs) {
    if (["merged", "rejected"].includes(pr.status)) continue;
    items.push({
      kind: "change_request",
      title: pr.title,
      meta: `${pr.id} · ${pr.documentPath}${pr.origin === "agent" ? " · from agent" : ""}`,
      href: `/pr/${pr.id}`,
      action: "Review",
      owner: pr.author.name,
      importance: pr.blastMaxSeverity,
      date: pr.updatedAt,
      body: `${pr.origin === "agent" ? "Proposed by an agent" : "Proposed change"} to ${pr.documentPath}${pr.affectedAgents ? ` · ${pr.affectedAgents} agent${pr.affectedAgents === 1 ? "" : "s"} affected` : ""}.`,
      links: [{ label: "Review the change", href: `/pr/${pr.id}` }],
    });
  }

  const TITLE: Record<string, (p: string) => string> = {
    conflict: (p) => `Conflict involving ${p}`,
    phrasing: (p) => `Confusing phrasing in ${p}`,
    mismatch: (p) => `Mismatch in ${p}`,
    redundancy: (p) => `Redundant text in ${p}`,
    freshness: (p) => `Stale: ${p}`,
    other: (p) => `Review ${p}`,
  };
  for (const t of tickets) {
    const type = t.type ?? "freshness";
    const kind = type === "conflict" ? "conflict" : type === "freshness" ? "ticket" : "suggestion";
    const by = t.source === "agent" ? ` · ${t.raisedBy ?? "triage agent"}` : "";
    const owner =
      t.source === "agent" ? t.raisedBy ?? "Triage Agent" : t.source === "human" ? t.assignee?.name ?? "—" : "System";
    const titleFor = TITLE[type] ?? TITLE.other;
    const links = [
      { label: `Open ${sn(t.documentPath)}`, href: `/edit/${t.documentPath}` },
      ...(t.relatedPaths ?? []).map((rp) => ({ label: `Open ${sn(rp)}`, href: `/edit/${rp}` })),
    ];
    items.push({
      kind,
      title: titleFor!(sn(t.documentPath)),
      meta: `${t.documentPath}${t.relatedPaths?.length ? ` ↔ ${t.relatedPaths.map(sn).join(", ")}` : ""}${by}`,
      href: `/edit/${t.documentPath}`,
      action: kind === "ticket" ? "Resolve" : "Review",
      owner,
      importance: kind === "conflict" ? "high" : "medium",
      date: t.createdAt,
      body: t.reason,
      quote: t.blockText || undefined,
      links,
    });
  }

  for (const m of health.missing) {
    items.push({
      kind: "missing",
      title: `“${m.query}”`,
      meta: `${m.misses}× missed${m.intent ? ` · intent: ${m.intent}` : ""}`,
      href: "/edit/policies/refunds.md",
      action: "Author",
      owner: "Agents",
      importance: m.misses >= 10 ? "high" : m.misses >= 5 ? "medium" : "low",
      date: m.lastAskedAt,
      body: `Agents searched for this and found nothing${m.intent ? `, while trying to: ${m.intent}` : ""}. Missed ${m.misses}× in the window — writing the answer is what closes the gap.`,
      quote: m.query,
      links: [{ label: "Author the answer", href: "/edit/policies/refunds.md" }],
    });
  }

  for (const c of health.cold) {
    if (c.reads > 0) continue;
    const file = c.path.split(" › ")[0] ?? c.path;
    items.push({
      kind: "unread",
      title: c.path,
      meta: `never read${c.freshness && c.freshness !== "fresh" ? ` · ${c.freshness}` : ""}`,
      href: `/edit/${file}`,
      action: "Review",
      importance: "low",
      date: c.lastReadAt,
      body: `Agents never read this in the window${c.freshness && c.freshness !== "fresh" ? ` and it's ${c.freshness}` : ""}. Check it's reachable and authorized, or trim it.`,
      links: [{ label: `Open ${sn(file)}`, href: `/edit/${file}` }],
    });
  }

  return <ReviewQueue items={items} />;
}
