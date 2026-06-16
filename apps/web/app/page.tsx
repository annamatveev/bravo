import Link from "next/link";
import { redirect } from "next/navigation";
import type { KnowledgeArea } from "@context-studio/types";
import { getHealth, getWorkspace, listContextPrs, listTickets } from "@/lib/api";
import { FreshnessPill, relativeTime } from "@/components/cpr/ui";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SourceChip } from "@/components/ui/SourceChip";
import { FirstRunRedirect } from "@/components/onboarding/FirstRunRedirect";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export default async function Dashboard() {
  let needsSetup = false;
  try {
    needsSetup = !(await getWorkspace()).configured;
  } catch {
    /* fall through */
  }
  if (needsSetup) redirect("/setup");

  let health;
  let prs;
  let tickets;
  try {
    [health, prs, tickets] = await Promise.all([getHealth(), listContextPrs(), listTickets()]);
  } catch {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h1 className="text-lg font-semibold text-amber-900 dark:text-amber-200">Couldn’t reach the backend</h1>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
          Start it with <code>pnpm dev:server</code>, then reload.
        </p>
      </div>
    );
  }

  const openCount = prs.filter((p) => !["merged", "rejected"].includes(p.status)).length;
  const queueCount =
    openCount +
    tickets.length +
    health.missing.length +
    health.cold.filter((c) => c.reads === 0).length;

  return (
    <div className="space-y-8">
      <FirstRunRedirect />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <SectionLabel n={1}>Agent Health</SectionLabel>
          <h1 className="text-3xl font-semibold tracking-tight">What your agent knows — and doesn’t</h1>
          <p className="max-w-prose text-sm text-muted">
            Which knowledge it leans on, what it never touches, and what it looked for but
            couldn’t find. {health.sample && <span className="text-accent">Sample data — live once the MCP read-proxy is connected.</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/welcome" className="text-sm font-medium text-brand hover:underline">
            How bravo works →
          </Link>
          <Link
            href="/queue"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Review queue · {queueCount} →
          </Link>
        </div>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={`Reads · ${health.periodDays}d`} value={health.totalReads.toLocaleString()} tone="text-brand" />
        <Stat label="Unanswered asks" value={health.totalMisses} tone="text-rose-700 dark:text-rose-300" />
        <Stat label="Never-read areas" value={health.cold.filter((c) => c.reads === 0).length} tone="text-amber-700 dark:text-amber-300" />
        <Stat label="Open change requests" value={openCount} tone="text-emerald-700 dark:text-emerald-300" />
      </div>

      {/* missing — the gaps */}
      <section className="space-y-3">
        <SectionLabel n={2}>Missing — asked, no answer</SectionLabel>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/[0.06] shadow-card">
          {health.missing.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted">No gaps recorded.</div>
          ) : (
            health.missing.map((m) => (
              <div key={m.query} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">“{m.query}”</div>
                  {m.intent && <div className="mt-0.5 text-xs text-muted">intent: {m.intent}</div>}
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <div className="font-semibold text-rose-700 dark:text-rose-300">{m.misses}× missed</div>
                  {m.lastAskedAt && <div>last {relativeTime(m.lastAskedAt)}</div>}
                </div>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-muted">
          Each is something an agent tried to read but found no answer for — a candidate to author.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AreaList n={3} title="Read most" areas={health.hot} empty="Nothing read yet." />
        <AreaList n={4} title="Never read" areas={health.cold} empty="Everything is used." cold />
      </div>

      <section className="space-y-3">
        <SectionLabel n={5}>Jump in</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickLink href="/changes" title="Change requests" meta={`${openCount} open`} />
          <QuickLink href="/governance" title="Governance" meta={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`} />
          <QuickLink href="/edit/policies/refunds.md" title="Edit a document" meta="Draft → propose" />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function AreaList({
  n,
  title,
  areas,
  empty,
  cold = false,
}: {
  n: number;
  title: string;
  areas: KnowledgeArea[];
  empty: string;
  cold?: boolean;
}) {
  return (
    <section className="space-y-3">
      <SectionLabel n={n}>{title}</SectionLabel>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {areas.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">{empty}</div>
        ) : (
          areas.map((a) => (
            <div key={a.path} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <SourceChip kind={a.kind} />
                  <span className="truncate text-sm">{a.path}</span>
                </div>
                {a.lastReadAt && <div className="mt-0.5 text-xs text-muted">last read {relativeTime(a.lastReadAt)}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {a.freshness && a.freshness !== "fresh" && <FreshnessPill state={a.freshness} />}
                <span className={`text-sm font-semibold ${cold ? "text-muted" : "text-brand"}`}>
                  {a.reads.toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function QuickLink({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-line bg-surface p-4 shadow-card transition hover:border-brand/40 hover:bg-hover"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <span className="text-brand transition group-hover:translate-x-0.5">→</span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted">{meta}</div>
    </Link>
  );
}
