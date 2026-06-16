import Link from "next/link";

/** Minimal landing — links to the seeded sample Context PR review screen. */
export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Change Requests</h1>
      <p className="max-w-prose text-muted">
        Review and authorize proposed changes to the context that feeds your
        autonomous agents. Open the sample request to see the Semantic Diff,
        blast-radius warning, and approval routing.
      </p>
      <Link
        href="/pr/pr-001"
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        Open sample Context PR →
      </Link>
    </div>
  );
}
