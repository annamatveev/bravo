import Link from "next/link";
import { redirect } from "next/navigation";
import { getFreshnessOverview, getWorkspace, listContextPrs, listTickets } from "@/lib/api";
import { Hint } from "@/components/ui/Tooltip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WelcomeGuide } from "@/components/onboarding/WelcomeGuide";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

const STATE_HINTS: Record<string, string> = {
  Fresh: "Reviewed recently, within its review window. Trusted.",
  Stale: "Past its review window — probably fine, but no one has confirmed it lately.",
  Expired: "Long past its window — shouldn't be trusted until re-confirmed.",
  Conflicted: "Two or more open change requests edit this same block; needs resolution.",
};

export default async function Home() {
  // No workspace bound yet → send the user to the setup wizard.
  // (redirect() throws NEXT_REDIRECT, so it must run outside the try/catch.)
  let needsSetup = false;
  try {
    needsSetup = !(await getWorkspace()).configured;
  } catch {
    // fall through to the backend-unreachable card below
  }
  if (needsSetup) redirect("/setup");

  let freshness;
  let prs;
  let tickets;
  try {
    [freshness, prs, tickets] = await Promise.all([
      getFreshnessOverview(),
      listContextPrs(),
      listTickets(),
    ]);
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

  const openCount = prs.filter((p) => !["merged", "rejected"].includes(p.status)).length;
  const agentCount = prs.filter(
    (p) => p.origin === "agent" && !["merged", "rejected"].includes(p.status),
  ).length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SectionLabel n={1}>Overview</SectionLabel>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to meva</h1>
        <p className="max-w-prose text-sm text-muted">
          Author and approve the context that feeds your AI agents — full version history
          underneath, no Git to learn.
        </p>
      </div>

      <WelcomeGuide />

      <section className="space-y-3">
        <SectionLabel n={2}>Context health</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Fresh" value={freshness.counts.fresh} tone="text-emerald-700 dark:text-emerald-300" />
          <Stat label="Stale" value={freshness.counts.stale} tone="text-amber-700 dark:text-amber-300" />
          <Stat label="Expired" value={freshness.counts.expired} tone="text-rose-700 dark:text-rose-300" />
          <Stat label="Conflicted" value={freshness.counts.conflicted} tone="text-fuchsia-700 dark:text-fuchsia-300" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel n={3}>Jump in</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickLink
            href="/changes"
            title="Review change requests"
            meta={`${openCount} open${agentCount ? ` · ${agentCount} from agents` : ""}`}
            body="Approve or request changes on proposed context edits."
          />
          <QuickLink
            href="/edit/policies/refunds.md"
            title="Edit a policy"
            meta="Draft → propose"
            body="Open a document; edits autosave privately until you propose them."
          />
          <QuickLink
            href="/governance"
            title="Governance"
            meta={`${tickets.length} open ticket${tickets.length === 1 ? "" : "s"}`}
            body="Freshness lifecycle and auto-opened review tickets."
          />
          <QuickLink
            href="/distribution"
            title="Distribution"
            meta="Signed per-agent bundles"
            body="What's published to your agents, and how they verify it."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="flex items-center gap-1 text-xs text-muted">
        {label} blocks
        {STATE_HINTS[label] && <Hint side="top">{STATE_HINTS[label]}</Hint>}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  meta,
  body,
}: {
  href: string;
  title: string;
  meta: string;
  body: string;
}) {
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
      <p className="mt-1.5 text-sm text-muted">{body}</p>
    </Link>
  );
}
