import type { ContextPR } from "@context-studio/types";
import { AuthorBadge, StatusBadge, relativeTime } from "./ui";

export function PRHeader({ pr }: { pr: ContextPR }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="font-mono text-xs">{pr.id}</span>
        <span aria-hidden>·</span>
        <span>{pr.documentPath}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="max-w-2xl text-2xl font-semibold leading-snug tracking-tight">
          {pr.title}
        </h1>
        <StatusBadge status={pr.status} />
      </div>

      <p className="max-w-prose text-[15px] leading-relaxed text-slate-600">
        {pr.description}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>Opened by</span>
        <AuthorBadge author={pr.author} />
        {pr.origin === "agent" && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            submitted via Agent API
          </span>
        )}
        <span aria-hidden>·</span>
        <span>updated {relativeTime(pr.updatedAt)}</span>
      </div>
    </div>
  );
}
