"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  API_BASE,
  createSuggestion,
  getContextPr,
  getDistribution,
  getDocumentView,
  getEvals,
  getFreshnessOverview,
  getHealth,
  getInsights,
  getWorkspace,
  listContextPrs,
  listTickets,
} from "@/lib/api";
import { authHeaders, getSession } from "@/lib/auth";
import { DEMO } from "@/lib/demo";
import { SectionLabel } from "@/components/ui/SectionLabel";

type Method = "GET" | "POST";
type Auth = "none" | "reviewer" | "owner" | "agent-key";

interface Param {
  name: string;
  def: string;
  in: "path" | "query";
}

interface Endpoint {
  id: string;
  method: Method;
  path: string;
  summary: string;
  auth: Auth;
  area: string;
  params?: Param[];
  body?: string;
  /** Read-only / additive calls we run in the browser. Writes are cURL-only. */
  runnable: boolean;
  /** Additive write — gate behind an explicit confirm. */
  write?: boolean;
}

const ENDPOINTS: Endpoint[] = [
  { id: "health", method: "GET", path: "/api/context/health", summary: "Agent read/miss overview behind the dashboard.", auth: "none", area: "Health", runnable: true },
  { id: "insights", method: "GET", path: "/api/context/insights", summary: "Per-file reads, provenance mix, and signals.", auth: "none", area: "Health", runnable: true },

  { id: "listPrs", method: "GET", path: "/api/context/pr", summary: "List all change requests.", auth: "none", area: "Change requests", runnable: true },
  { id: "getPr", method: "GET", path: "/api/context/pr/{id}", summary: "One change request with its semantic diff + blast radius.", auth: "none", area: "Change requests", params: [{ name: "id", def: "pr-001", in: "path" }], runnable: true },
  { id: "evals", method: "GET", path: "/api/context/pr/{id}/evals", summary: "Run the regression evals for a change request.", auth: "none", area: "Change requests", params: [{ name: "id", def: "pr-001", in: "path" }], runnable: true },
  {
    id: "approve", method: "POST", path: "/api/context/pr/{id}/approve",
    summary: "Approve / request changes / reject. Final approval merges + publishes.",
    auth: "reviewer", area: "Change requests", params: [{ name: "id", def: "pr-001", in: "path" }],
    body: JSON.stringify({ action: "approve", blastRadiusAcknowledged: true }, null, 2), runnable: false,
  },
  {
    id: "agentSubmit", method: "POST", path: "/api/context/pr/agent-submit",
    summary: "An agent proposes a change — opens a change request for human review.",
    auth: "agent-key", area: "Change requests",
    body: JSON.stringify(
      { agentId: "agent-refunds", agentName: "Refund Resolution Agent", documentPath: "policies/refunds.md", title: "Add store-credit fallback", description: "Document the fallback when a card refund fails.", proposedContent: "# Refund Policy\n…" },
      null, 2,
    ),
    runnable: false,
  },

  { id: "freshness", method: "GET", path: "/api/context/governance/freshness", summary: "Block freshness overview.", auth: "none", area: "Governance", runnable: true },
  { id: "tickets", method: "GET", path: "/api/context/governance/tickets", summary: "Open review tickets + triage suggestions.", auth: "none", area: "Governance", runnable: true },
  {
    id: "suggestions", method: "POST", path: "/api/context/suggestions",
    summary: "Triage-agent feedback — file a conflict / phrasing / mismatch into the Inbox.",
    auth: "none", area: "Governance",
    body: JSON.stringify(
      { type: "conflict", documentPath: "policies/shipping.md", reason: "Disagrees with memory/customer-faqs.md on customs fees.", relatedPaths: ["memory/customer-faqs.md"], agentName: "Context Triage Agent" },
      null, 2,
    ),
    runnable: true, write: true,
  },

  { id: "docView", method: "GET", path: "/api/context/doc/view", summary: "Document content + per-block attribution and usage.", auth: "none", area: "Library", params: [{ name: "path", def: "policies/refunds.md", in: "query" }], runnable: true },

  { id: "workspace", method: "GET", path: "/api/context/workspace", summary: "Active workspace + its bound sources.", auth: "none", area: "Workspace", runnable: true },
  { id: "distribution", method: "GET", path: "/api/context/distribution", summary: "Published per-agent bundle status.", auth: "none", area: "Distribution", runnable: true },
  { id: "publish", method: "POST", path: "/api/context/distribution/publish", summary: "Re-publish signed per-agent bundles.", auth: "owner", area: "Distribution", runnable: false },
];

const AREAS = [...new Set(ENDPOINTS.map((e) => e.area))];

const AUTH_CHIP: Record<Auth, { label: string; color: string }> = {
  none: { label: "public", color: "#57606a" },
  reviewer: { label: "reviewer", color: "#0969da" },
  owner: { label: "owner", color: "#8250df" },
  "agent-key": { label: "agent key", color: "#bf8700" },
};

async function invoke(ep: Endpoint, inputs: Record<string, string>): Promise<unknown> {
  const as = getSession()?.user.id ?? "user-dana";
  switch (ep.id) {
    case "health": return getHealth();
    case "insights": return getInsights();
    case "listPrs": return listContextPrs();
    case "getPr": return getContextPr(inputs.id || "pr-001");
    case "evals": return getEvals(inputs.id || "pr-001");
    case "freshness": return getFreshnessOverview();
    case "tickets": return listTickets();
    case "distribution": return getDistribution();
    case "workspace": return getWorkspace();
    case "docView": return getDocumentView(inputs.path || "policies/refunds.md", as);
    case "suggestions": return createSuggestion(JSON.parse(inputs.body || "{}"), authHeaders());
    default: throw new Error("This endpoint isn't runnable in the browser — use the cURL snippet.");
  }
}

function resolvePath(ep: Endpoint, inputs: Record<string, string>): string {
  let path = ep.path;
  const query: string[] = [];
  for (const p of ep.params ?? []) {
    const v = inputs[p.name] || p.def;
    if (p.in === "path") path = path.replace(`{${p.name}}`, encodeURIComponent(v));
    else query.push(`${p.name}=${encodeURIComponent(v)}`);
  }
  return `${API_BASE}${path}${query.length ? `?${query.join("&")}` : ""}`;
}

function curlFor(ep: Endpoint, inputs: Record<string, string>): string {
  const url = resolvePath(ep, inputs);
  const auth =
    ep.auth === "agent-key"
      ? `-H "Authorization: Bearer $AGENT_KEY"`
      : ep.auth !== "none"
        ? `-H "Authorization: Bearer $BRAVO_TOKEN"`
        : "";
  if (ep.method === "GET") return ["curl", auth, `"${url}"`].filter(Boolean).join(" ");
  return [
    `curl -X POST "${url}"`,
    `  -H "Content-Type: application/json"`,
    ...(auth ? [`  ${auth}`] : []),
    `  -d '${inputs.body ?? ep.body ?? "{}"}'`,
  ].join(" \\\n");
}

export function ApiExplorer() {
  const [user, setUser] = useState<string | null>(null);
  useEffect(() => setUser(getSession()?.user.name ?? null), []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SectionLabel n={1}>Docs</SectionLabel>
        <h1 className="text-3xl font-semibold tracking-tight">API</h1>
        <p className="max-w-prose text-sm text-muted">
          The HTTP API behind bravo. Base URL <code className="rounded bg-surface2 px-1.5 py-0.5 text-xs">{API_BASE}</code>.
          {DEMO && <span className="text-accent"> Demo mode — responses are sample data and nothing is written.</span>}
        </p>
      </div>

      {/* Security posture */}
      <div className="rounded-xl border border-line bg-surface p-4 text-sm shadow-card">
        <div className="font-medium">Testing safely</div>
        <ul className="mt-2 space-y-1.5 text-muted">
          <li>· <span className="font-medium text-ink">Read-only</span> endpoints run here in your browser.</li>
          <li>· <span className="font-medium text-ink">Writes</span> and <span className="font-medium text-ink">agent-key</span> endpoints are shown as cURL — you run them in a terminal with your own token, so credentials are never typed into this page.</li>
          <li>· Browser calls authenticate with your signed-in session{user ? <> (currently <span className="font-medium text-ink">{user}</span>)</> : <> — <Link href="/login" className="text-brand hover:underline">sign in</Link> for authenticated routes</>}.</li>
          <li>· An <span className="font-medium text-ink">agent key</span> is issued server-side and shown once; pass it as <code className="rounded bg-surface2 px-1 text-xs">Authorization: Bearer …</code>. Never paste it into a web page.</li>
        </ul>
      </div>

      {AREAS.map((area) => (
        <section key={area} className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{area}</div>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {ENDPOINTS.filter((e) => e.area === area).map((ep) => (
              <EndpointCard key={ep.id} ep={ep} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of ep.params ?? []) init[p.name] = p.def;
    if (ep.body) init.body = ep.body;
    return init;
  });
  const [confirmed, setConfirmed] = useState(false);
  const [resp, setResp] = useState<{ loading: boolean; ok?: boolean; text?: string; error?: string } | null>(null);

  const setInput = (k: string, v: string) => setInputs((s) => ({ ...s, [k]: v }));

  async function send() {
    setResp({ loading: true });
    try {
      const data = await invoke(ep, inputs);
      setResp({ loading: false, ok: true, text: JSON.stringify(data, null, 2) });
    } catch (e) {
      setResp({ loading: false, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const methodColor = ep.method === "GET" ? "#1a7f37" : "#bc4c00";
  const chip = AUTH_CHIP[ep.auth];

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-hover">
        <span className="w-12 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-bold uppercase" style={{ background: `${methodColor}1f`, color: methodColor }}>
          {ep.method}
        </span>
        <code className="shrink-0 font-mono text-sm">{ep.path}</code>
        <span className="hidden min-w-0 flex-1 truncate text-xs text-muted sm:block">{ep.summary}</span>
        <span className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${chip.color}1f`, color: chip.color }}>
          {chip.label}
        </span>
        <span className="shrink-0 text-muted">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line bg-surface2/40 px-4 py-3">
          <p className="text-sm text-muted sm:hidden">{ep.summary}</p>

          {ep.params?.map((p) => (
            <label key={p.name} className="block text-xs">
              <span className="text-muted">{p.name} <span className="opacity-60">({p.in})</span></span>
              <input
                value={inputs[p.name] ?? ""}
                onChange={(e) => setInput(p.name, e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
          ))}

          {ep.body !== undefined && (
            <label className="block text-xs">
              <span className="text-muted">request body (JSON)</span>
              <textarea
                value={inputs.body ?? ""}
                onChange={(e) => setInput("body", e.target.value)}
                spellCheck={false}
                className="mt-0.5 h-36 w-full resize-y rounded-lg border border-line bg-surface px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
          )}

          {ep.runnable ? (
            <div className="space-y-2">
              {ep.write && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  This creates a review item{DEMO ? " (simulated in demo)" : ""}.
                </label>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={send}
                  disabled={(ep.write && !confirmed) || resp?.loading}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {resp?.loading ? "Sending…" : "Send"}
                </button>
                <span className="font-mono text-xs text-muted">{ep.method} {resolvePath(ep, inputs).replace(API_BASE, "")}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
              {ep.auth === "agent-key"
                ? "Authenticate with an agent API key — run from a terminal, not the browser."
                : `Mutating endpoint — run from a terminal with your ${ep.auth} token.`}
            </div>
          )}

          <CodeBlock title="cURL" code={curlFor(ep, inputs)} />

          {resp && !resp.loading && (
            <div>
              <div className={`mb-1 font-mono text-[11px] uppercase tracking-wide ${resp.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {resp.ok ? "200 · response" : "error"}
              </div>
              <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">{resp.ok ? resp.text : resp.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted">{title}</div>
      <pre className="overflow-x-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">{code}</pre>
    </div>
  );
}
