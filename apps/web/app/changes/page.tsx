import Link from "next/link";
import { exportUrls, listContextPrs } from "@/lib/api";
import { AuthorBadge, SeverityPill, StatusBadge, relativeTime } from "@/components/cpr/ui";
import { Hint } from "@/components/ui/Tooltip";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export default async function ChangeRequests() {
  let prs;
  try {
    prs = await listContextPrs();
  } catch {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h1 className="text-lg font-semibold text-amber-900 dark:text-amber-200">Couldn’t reach the backend</h1>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
          Start it with <code>pnpm dev:server</code> (default http://localhost:4000), then reload.
        </p>
      </div>
    );
  }

  const open = prs.filter((p) => !["merged", "rejected"].includes(p.status));
  const closed = prs.filter((p) => ["merged", "rejected"].includes(p.status));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <SectionLabel n={1}>The Ledger</SectionLabel>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            Change Requests
            <Hint>
              Each row is a proposed change to your context, opened by a person or an agent.
              Click one to review its diff, impact, and checks, then approve or request changes.
            </Hint>
          </h1>
          <p className="max-w-prose text-sm text-muted">
            Review and authorize proposed changes to the context that feeds your autonomous agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportUrls.ledgerCsv}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition hover:bg-hover hover:text-ink"
          >
            Export CSV
          </a>
          <Link
            href="/edit/policies/refunds.md"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            + Edit a policy
          </Link>
        </div>
      </div>

      <Section n={2} title={`Open · ${open.length}`}>
        {open.length === 0 ? (
          <Empty>No open change requests.</Empty>
        ) : (
          open.map((pr) => <PrRow key={pr.id} pr={pr} />)
        )}
      </Section>

      {closed.length > 0 && (
        <Section n={3} title={`Closed · ${closed.length}`}>
          {closed.map((pr) => (
            <PrRow key={pr.id} pr={pr} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionLabel n={n}>{title}</SectionLabel>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {children}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 text-sm text-muted">{children}</div>;
}

function PrRow({ pr }: { pr: Awaited<ReturnType<typeof listContextPrs>>[number] }) {
  return (
    <Link
      href={`/pr/${pr.id}`}
      className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-hover"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{pr.title}</span>
          {pr.origin === "agent" && (
            <span className="shrink-0 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
              agent
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span className="font-mono">{pr.id}</span>
          <span aria-hidden>·</span>
          <span>{pr.documentPath}</span>
          <span aria-hidden>·</span>
          <span>updated {relativeTime(pr.updatedAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {pr.affectedAgents > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <SeverityPill severity={pr.blastMaxSeverity} />
            {pr.affectedAgents} agent{pr.affectedAgents === 1 ? "" : "s"}
          </span>
        )}
        <AuthorBadge author={pr.author} />
        <StatusBadge status={pr.status} />
      </div>
    </Link>
  );
}
