import Link from "next/link";
import { getDocumentView } from "@/lib/api";
import { Editor } from "@/components/editor/Editor";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

// For the static (GitHub Pages) demo, pre-render the sample document.
export function generateStaticParams() {
  return process.env.STATIC_EXPORT === "1" ? [{ path: ["policies", "refunds.md"] }] : [];
}

const ACTING_USER = "user-dana";

export default async function EditPage({
  params,
}: {
  params: { path: string[] };
}) {
  const documentPath = params.path.map(decodeURIComponent).join("/");

  let doc;
  try {
    doc = await getDocumentView(documentPath, ACTING_USER);
  } catch {
    return (
      <ErrorState title="Couldn’t reach the backend" body="Start the server and reload." />
    );
  }

  if (!doc) {
    return (
      <ErrorState
        title="Document not found"
        body={`No document at “${documentPath}”. Try policies/refunds.md.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← All change requests
      </Link>
      <Editor doc={doc} />
    </div>
  );
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
      <h1 className="text-lg font-semibold text-amber-900 dark:text-amber-200">{title}</h1>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{body}</p>
    </div>
  );
}
