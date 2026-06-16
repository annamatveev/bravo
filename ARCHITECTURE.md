# Context Studio — Architecture

A **Context Management IDE**: a tool for non-technical *Context Owners* (business
analysts, compliance officers) to author and authorize the definitive knowledge
state that feeds autonomous AI agents. It presents a calm, wiki-like UI while
maintaining strict, code-level version control underneath.

## The thesis: an abstraction boundary

```
   ┌──────────────────────────────────────────────────────────┐
   │  apps/web  (Next.js)   — speaks the DOMAIN language only   │
   │  "open a change request", "approve", "this looks stale"    │
   └───────────────────────────┬──────────────────────────────┘
                               │  HTTP, domain verbs (no Git words)
   ┌───────────────────────────▼──────────────────────────────┐
   │  apps/server (Express)                                     │
   │   GitService            — the ONLY code that touches Git   │
   │   SemanticDiffService   — text → logical blocks            │
   │   Prisma/SQLite         — metadata Git can't model         │
   └───────────────────────────┬──────────────────────────────┘
                               │  simple-git
   ┌───────────────────────────▼──────────────────────────────┐
   │  .context-repo/  — a real Git repo on disk (source of      │
   │                    truth for context *content*)            │
   └──────────────────────────────────────────────────────────┘
```

The product only works if the UI never leaks Git. Branches, commits and
squash-merges are an implementation detail of `GitService`. Everything above it
talks about *Context PRs*, *blocks*, *freshness*, and *agents*.

## Source-of-truth split

- **Git** owns context *content* and its history (the authoritative text).
- **SQLite/Prisma** owns *metadata* Git models poorly: PR lifecycle state,
  reviewer routing, the attribution index, the freshness/TTL state machine, and
  the agent → context "blast radius" mappings.

## The four modules

### 1. Abstracted Version Control Backend — `apps/server/src/services/GitService.ts`
Translates UI verbs into raw Git:
- editing a document → `git checkout -b draft/<pr>` transparently (autosave branch);
- approving a draft → **squash-merge** all autosaves into one semantic commit on
  `main`, then delete the draft branch.

### 2. Context Pull Request (CPR) UI — `apps/web/app/pr/[id]` *(this deliverable)*
- **Semantic Diff** viewer: block-level add/modify/remove, wiki-style, no red/green soup.
- **Blast Radius** warning: which agents are affected, severity-ranked, gates the merge.
- **Approval routing**: required reviewers, decisions, merge button.
- `POST /api/context/pr/agent-submit`: lets autonomous agents open CPRs when they
  discover workarounds or edge cases.

### 3. Dual-Mode Editor & Attribution Gutter — *(future)*
- Rich-text/Markdown editor for drafting policies.
- **Attribution Gutter**: hover a sentence → who wrote it (human/agent), when, and
  the CPR that merged it. A non-technical `git blame`.
- Export to machine-readable `.fcontext/` directories and `llms.txt`.

### 4. Freshness & Governance State Machine — *(future)*
- Every block tracks `fresh | stale | expired | conflicted`.
- A background worker flags blocks `stale` past their configurable TTL and opens a
  review ticket for the Context Owner automatically.

## Tech stack

| Layer    | Choice                                            |
|----------|---------------------------------------------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind |
| Backend  | Node.js + Express + TypeScript                    |
| Git      | `simple-git` (wraps the real `git` binary)        |
| Database | SQLite + Prisma                                   |
| Shared   | `packages/types` — domain types for both apps     |

## Build & run

```bash
pnpm install
pnpm --filter @context-studio/server prisma:generate
pnpm seed          # initializes .context-repo/ as a real Git repo + sample CPR
pnpm dev           # server on :4000, web on :3000
```

Open http://localhost:3000/pr/pr-001 for the CPR review screen.

## Current status

Module 2 (CPR review screen) is implemented end-to-end against a seeded sample
CPR backed by a real on-disk Git repo. Modules 1, 3 and 4 are scaffolded at the
type and architecture level and grow from here.
