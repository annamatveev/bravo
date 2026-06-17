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
    });
  }

  for (const t of tickets) {
    const type = t.type ?? "freshness";
    const kind =
      type === "conflict" ? "conflict" : type === "freshness" ? "ticket" : "suggestion";
    const related = t.relatedPaths?.length ? ` · vs ${t.relatedPaths.join(", ")}` : "";
    const by = t.source === "agent" ? ` · ${t.raisedBy ?? "triage agent"}` : "";
    const owner =
      t.source === "agent" ? t.raisedBy ?? "Triage Agent" : t.source === "human" ? t.assignee?.name ?? "—" : "System";
    items.push({
      kind,
      title: t.reason,
      meta: `${t.documentPath}${related}${by}`,
      href: kind === "ticket" ? "/governance" : `/edit/${t.documentPath}`,
      action: kind === "ticket" ? "Resolve" : "Review",
      owner,
      importance: kind === "conflict" ? "high" : "medium",
      date: t.createdAt,
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
    });
  }

  for (const c of health.cold) {
    if (c.reads > 0) continue;
    items.push({
      kind: "unread",
      title: c.path,
      meta: `never read${c.freshness && c.freshness !== "fresh" ? ` · ${c.freshness}` : ""}`,
      href: "/edit/policies/refunds.md",
      action: "Review",
      importance: "low",
      date: c.lastReadAt,
    });
  }

  return <ReviewQueue items={items} />;
}
