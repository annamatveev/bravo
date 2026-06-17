import Link from "next/link";
import type { FileInsight, InsightFlag, MissingArea } from "@context-studio/types";

/**
 * Health map — the context owner's "what needs me" overview.
 *
 * Files are plotted by impact (reads) vs risk (conflicts / unverified AI /
 * staleness / open requests). The dangerous quadrant is top-right: heavily-read
 * files that are also risky. A ranked attention list and the top unanswered
 * asks sit alongside.
 */

const FLAG_INFO: Partial<Record<InsightFlag, { color: string; label: string }>> = {
  conflict: { color: "#d946ef", label: "Conflict" },
  unverified: { color: "#bf8700", label: "Unverified AI" },
  stale: { color: "#f59e0b", label: "Stale" },
  never_read: { color: "#cf222e", label: "Never read" },
  rarely_read: { color: "#64748b", label: "Rarely read" },
};
const HEALTHY = { color: "#10b981", label: "Healthy" };

function risk(f: FileInsight): number {
  return (
    (f.flags.includes("conflict") ? 3 : 0) +
    (f.flags.includes("unverified") ? 2 : 0) +
    (f.flags.includes("stale") ? 2 : 0) +
    Math.min(f.openRequests, 3)
  );
}
const ORDER: InsightFlag[] = ["conflict", "unverified", "stale", "never_read", "rarely_read"];
function dominant(f: FileInsight) {
  for (const k of ORDER) if (f.flags.includes(k) && FLAG_INFO[k]) return FLAG_INFO[k]!;
  return HEALTHY;
}
function reason(f: FileInsight): string {
  const hot = f.reads >= 150;
  if (f.flags.includes("conflict")) return hot ? "Conflicts in a heavily-read file" : "Conflicts with another file";
  if (f.flags.includes("unverified")) return hot ? "Unreviewed AI text agents lean on" : "Contains unreviewed AI text";
  if (f.flags.includes("stale")) return "Past its review window";
  if (f.flags.includes("never_read")) return "Never read — candidate to remove";
  if (f.flags.includes("rarely_read")) return "Rarely read — candidate to trim";
  return "Healthy";
}

export function HealthMap({ files, missing }: { files: FileInsight[]; missing: MissingArea[] }) {
  const W = 360;
  const H = 250;
  const m = 30;
  const maxReads = Math.max(...files.map((f) => f.reads), 1);
  const maxRisk = Math.max(...files.map(risk), 1);
  const mapX = (reads: number) => m + (reads / maxReads) * (W - 2 * m);
  const mapY = (rk: number) => H - m - (rk / maxRisk) * (H - 2 * m);
  const hotX = mapX(Math.min(150, maxReads * 0.6));
  const riskY = mapY(0.75);

  const attention = [...files]
    .filter((f) => risk(f) > 0 || f.flags.includes("rarely_read") || f.flags.includes("never_read"))
    .sort((a, b) => risk(b) * (b.reads + 1) - risk(a) * (a.reads + 1) || b.reads - a.reads)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_19rem]">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">Impact vs risk</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-muted" role="img" aria-label="Files plotted by reads versus risk">
          <line x1={hotX} y1={m - 8} x2={hotX} y2={H - m} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
          <line x1={m} y1={riskY} x2={W - m} y2={riskY} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
          <text x={W - m} y={m - 1} textAnchor="end" fill="currentColor" fontSize="9.5" opacity="0.75">fix first ↗</text>
          <text x={m} y={m - 1} fill="currentColor" fontSize="9.5" opacity="0.6">review / trim</text>
          <text x={W - m} y={H - 6} textAnchor="end" fill="currentColor" fontSize="9.5" opacity="0.6">more read →</text>
          <text x={m} y={H - 6} fill="currentColor" fontSize="9.5" opacity="0.6">relied-on &amp; healthy</text>
          {files.map((f) => {
            const d = dominant(f);
            const r = 5 + Math.min(f.openRequests, 4) * 1.8;
            return (
              <circle key={f.path} cx={mapX(f.reads)} cy={mapY(risk(f))} r={r} fill={`${d.color}26`} stroke={d.color} strokeWidth="1.5">
                <title>{`${f.path} — ${f.reads.toLocaleString()} reads · ${reason(f)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
          {[...Object.values(FLAG_INFO), HEALTHY].map((i) => (
            <span key={i!.label} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: i!.color }} />
              {i!.label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">Needs your attention</div>
          <ul className="space-y-1.5">
            {attention.length === 0 && <li className="text-xs text-muted">Everything looks healthy.</li>}
            {attention.map((f) => {
              const d = dominant(f);
              const name = f.path.split("/").slice(1).join("/") || f.path;
              return (
                <li key={f.path}>
                  <Link href={`/edit/${f.path}`} className="block rounded-lg px-1 py-1 transition hover:bg-hover">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                      <span className="truncate">{name}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted">{f.reads.toLocaleString()} reads</span>
                    </div>
                    <div className="pl-3.5 text-xs text-muted">{reason(f)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">Top gaps · unanswered asks</span>
            <Link href="/inbox?filter=missing" className="text-xs text-brand hover:underline">all →</Link>
          </div>
          <ul className="space-y-1.5">
            {missing.length === 0 && <li className="text-xs text-muted">No unanswered asks.</li>}
            {missing.slice(0, 4).map((mm) => (
              <li key={mm.query} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">{mm.query}</span>
                <span className="shrink-0 font-medium text-rose-600 dark:text-rose-300">{mm.misses}× missed</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
