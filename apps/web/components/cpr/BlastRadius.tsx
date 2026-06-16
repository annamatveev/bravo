import type { BlastRadius as Blast } from "@context-studio/types";
import { SeverityPill } from "./ui";

const HEADLINE: Record<Blast["maxSeverity"], { title: string; tone: string }> = {
  low: { title: "Low impact", tone: "border-emerald-200 bg-emerald-50" },
  medium: { title: "Review recommended", tone: "border-amber-200 bg-amber-50" },
  high: { title: "High impact — acknowledge before merging", tone: "border-rose-200 bg-rose-50" },
};

/**
 * Blast Radius warning — which autonomous agents this change touches, ranked by
 * severity. The highest severity gates the merge button in the approval panel.
 */
export function BlastRadius({ blast }: { blast: Blast }) {
  if (blast.agents.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-sm font-semibold text-emerald-800">No agents affected</h2>
        <p className="mt-1 text-sm text-emerald-700">
          This change doesn’t touch context any registered agent relies on.
        </p>
      </section>
    );
  }

  const head = HEADLINE[blast.maxSeverity];

  return (
    <section className={`rounded-xl border p-4 ${head.tone}`}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden>⚠️</span> Blast radius — {head.title}
        </h2>
        <SeverityPill severity={blast.maxSeverity} />
      </div>
      <p className="mt-1 text-sm text-slate-700">
        {blast.agents.length} agent{blast.agents.length === 1 ? "" : "s"} depend on context this
        change modifies:
      </p>

      <ul className="mt-3 space-y-2">
        {blast.agents.map((agent) => (
          <li
            key={agent.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-black/5 bg-white/70 p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{agent.name}</span>
                <SeverityPill severity={agent.severity} />
              </div>
              <div className="text-xs text-muted">{agent.purpose}</div>
              <div className="mt-1 text-xs text-slate-600">{agent.reason}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
