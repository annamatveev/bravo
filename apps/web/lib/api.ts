import type {
  ApprovalRequestBody,
  ApprovalResponse,
  ContextPR,
} from "@context-studio/types";

/** Base URL of the abstracted version-control backend (apps/server). */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

/** Fetch a full Context PR for the review screen (server-side, uncached). */
export async function getContextPr(id: string): Promise<ContextPR | null> {
  const res = await fetch(`${API_BASE}/api/context/pr/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load Context PR ${id}: ${res.status}`);
  return (await res.json()) as ContextPR;
}

/** Submit an approval decision (client-side). */
export async function submitApproval(
  id: string,
  body: ApprovalRequestBody,
): Promise<{ ok: true; data: ApprovalResponse } | { ok: false; error: string; code?: string }> {
  const res = await fetch(`${API_BASE}/api/context/pr/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: typeof json.error === "string" ? json.error : "Request failed.",
      code: json.code,
    };
  }
  return { ok: true, data: json as ApprovalResponse };
}
