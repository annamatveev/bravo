import type {
  Author,
  BlastSeverity,
  FreshnessState,
  PrStatus,
} from "@context-studio/types";

/** A small chip distinguishing human vs agent authorship. */
export function AuthorBadge({ author, className = "" }: { author: Author; className?: string }) {
  const isAgent = author.kind === "agent";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isAgent
          ? "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300"
          : "bg-surface2 text-muted"
      } ${className}`}
      title={author.role ?? (isAgent ? "Autonomous agent" : "Person")}
    >
      <span aria-hidden>{isAgent ? "🤖" : "👤"}</span>
      {author.name}
    </span>
  );
}

const SEVERITY_STYLE: Record<BlastSeverity, string> = {
  low: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  high: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25",
};

export function SeverityPill({ severity }: { severity: BlastSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${SEVERITY_STYLE[severity]}`}
    >
      {severity}
    </span>
  );
}

const STATUS_LABEL: Record<PrStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-surface2 text-muted" },
  in_review: { label: "In review", className: "bg-blue-500/12 text-blue-700 dark:text-blue-300" },
  changes_requested: { label: "Changes requested", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  approved: { label: "Approved", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  merged: { label: "Merged", className: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300" },
  rejected: { label: "Rejected", className: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
};

export function StatusBadge({ status }: { status: PrStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

const FRESHNESS_STYLE: Record<FreshnessState, { label: string; className: string }> = {
  fresh: { label: "Fresh", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25" },
  stale: { label: "Stale", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/25" },
  expired: { label: "Expired", className: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25" },
  conflicted: { label: "Conflicted", className: "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/25" },
};

export function FreshnessPill({ state }: { state: FreshnessState }) {
  const s = FRESHNESS_STYLE[state];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.className}`}
    >
      {s.label}
    </span>
  );
}

/** Compact relative time, e.g. "3 days ago". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86_400_000;
  const hour = 3_600_000;
  if (diff < hour) return "just now";
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  const days = Math.round(diff / day);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
