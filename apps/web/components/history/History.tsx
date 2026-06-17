"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryEvent } from "@context-studio/types";
import { getFileHistory, getLineHistory } from "@/lib/api";
import { relativeTime } from "@/components/cpr/ui";

function Timeline({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">No history yet.</p>;
  return (
    <ol className="space-y-0">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          {/* rail */}
          <div className="flex flex-col items-center">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: e.type === "publish" ? "#10b981" : "var(--brand)" }}
            />
            {i < events.length - 1 && <span className="w-px flex-1 bg-line" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{e.title}</span>
              {e.type === "publish" && (
                <span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  published
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {e.authorName && (
                <>
                  {e.authorName}
                  {e.authorKind === "agent" ? " (AI)" : ""} ·{" "}
                </>
              )}
              {relativeTime(e.date)}
              {e.version && <> · v{e.version.slice(0, 10)}</>}
            </div>
            {e.summary && (e.summary.added || e.summary.removed || e.summary.modified) ? (
              <div className="mt-1 flex gap-2 text-[11px] font-medium">
                {e.summary.added > 0 && <span className="text-added-accent">+{e.summary.added}</span>}
                {e.summary.modified > 0 && <span className="text-modified-accent">~{e.summary.modified}</span>}
                {e.summary.removed > 0 && <span className="text-removed-accent">−{e.summary.removed}</span>}
              </div>
            ) : null}
            {e.prId && (
              <Link href={`/pr/${e.prId}`} className="mt-1 inline-block text-xs font-medium text-brand hover:underline">
                View change ({e.prId}) →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FileHistoryView({ path }: { path: string }) {
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setEvents(null);
    getFileHistory(path)
      .then((h) => setEvents(h.events))
      .catch((e) => setError(String(e?.message ?? e)));
  }, [path]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">History</div>
        <p className="text-xs text-muted">Every merge and publish for this file, newest first — the chain of changes.</p>
      </div>
      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : !events ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <Timeline events={events} />
      )}
    </div>
  );
}

export function LineHistoryModal({ path, text, onClose }: { path: string; text: string; onClose: () => void }) {
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  useEffect(() => {
    getLineHistory(path, text).then(setEvents).catch(() => setEvents([]));
  }, [path, text]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold">Line history</div>
        <div className="rounded-lg bg-surface2 px-3 py-2 text-xs italic text-muted">“{text}”</div>
        {!events ? <p className="text-sm text-muted">Loading…</p> : <Timeline events={events} />}
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
