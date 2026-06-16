/**
 * Agent registry + blast-radius computation.
 *
 * In a real system this mapping comes from the agents' declared context
 * subscriptions (which `.fcontext` sections / `llms.txt` files they consume).
 * For the prototype it's a static registry keyed by section keywords.
 */

import type { BlastSeverity, SemanticDiff } from "@context-studio/types";

interface RegisteredAgent {
  id: string;
  name: string;
  purpose: string;
  /** Lowercased keywords; if a changed heading/section matches, the agent is hit. */
  watches: string[];
  /** Base severity when this agent is affected. */
  baseSeverity: BlastSeverity;
}

export const AGENT_REGISTRY: RegisteredAgent[] = [
  {
    id: "agent-refunds",
    name: "Refund Resolution Agent",
    purpose: "Decides customer refund eligibility and amounts.",
    watches: ["refund", "return", "window", "eligibility"],
    baseSeverity: "high",
  },
  {
    id: "agent-billing",
    name: "Billing Reconciliation Agent",
    purpose: "Reconciles invoices and applies credits.",
    watches: ["billing", "invoice", "credit", "charge", "fee"],
    baseSeverity: "medium",
  },
  {
    id: "agent-support",
    name: "Tier-1 Support Agent",
    purpose: "Answers customer questions from policy context.",
    watches: ["policy", "support", "contact", "hours", "escalation"],
    baseSeverity: "low",
  },
  {
    id: "agent-compliance",
    name: "Compliance Audit Agent",
    purpose: "Flags policy text that conflicts with regulation.",
    watches: ["compliance", "regulation", "gdpr", "retention", "consent"],
    baseSeverity: "high",
  },
];

const SEVERITY_RANK: Record<BlastSeverity, number> = { low: 0, medium: 1, high: 2 };

export interface ComputedBlastEntry {
  agentId: string;
  agentName: string;
  purpose: string;
  severity: BlastSeverity;
  reason: string;
}

/**
 * Determine which agents a proposed change affects by matching their watched
 * keywords against the text of changed (added / removed / modified) blocks.
 */
export function computeBlastEntries(diff: SemanticDiff): ComputedBlastEntry[] {
  const changed = diff.blocks.filter((b) => b.kind !== "unchanged");
  const haystack = changed
    .map((b) => `${b.before ?? ""} ${b.after ?? ""}`.toLowerCase())
    .join(" ");

  const entries: ComputedBlastEntry[] = [];
  for (const agent of AGENT_REGISTRY) {
    const matched = agent.watches.filter((w) => haystack.includes(w));
    if (matched.length === 0) continue;

    // More matched keywords + more changed blocks => bump severity one notch.
    let severity = agent.baseSeverity;
    if (matched.length >= 2 && changed.length >= 3 && severity !== "high") {
      severity = SEVERITY_RANK[severity] === 0 ? "medium" : "high";
    }

    entries.push({
      agentId: agent.id,
      agentName: agent.name,
      purpose: agent.purpose,
      severity,
      reason: `Relies on context mentioning "${matched.join('", "')}", which this change touches.`,
    });
  }
  return entries;
}
