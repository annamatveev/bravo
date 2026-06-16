# Context Studio

A **Context Management IDE** — a tool for non-technical *Context Owners* (business
analysts, compliance officers) to author and authorize the definitive knowledge
state that feeds autonomous AI agents. Beautiful, wiki-like UI on top; strict,
code-level Git version control underneath, fully hidden from the user.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design and the four-module plan.

## What's built

This prototype implements **Module 2 — the Context Pull Request (CPR) review
screen** end-to-end against a real on-disk Git repo:

- **Semantic Diff** — block-level add/edit/remove rendered like a collaborative
  wiki (no red/green line gutters), with word-level emphasis inside edits.
- **Attribution Gutter** — hover any line to see who wrote it (human or agent),
  when, and which change request introduced it.
- **Blast Radius** — which autonomous agents are affected, severity-ranked; the
  highest severity gates the merge button.
- **Approval routing** — required reviewers, decisions, and a squash-merge on
  approval (all autosaves collapse into one semantic commit on `main`).
- **Agent API** — `POST /api/context/pr/agent-submit` lets agents open CPRs.

Modules 1, 3 and 4 are scaffolded at the type/architecture level.

## Prerequisites

- Node ≥ 20, `pnpm`, and a `git` binary on PATH (the backend shells out to real Git).

## Setup & run

```bash
pnpm install
pnpm --filter @context-studio/server prisma:generate   # generate Prisma client
pnpm --filter @context-studio/server exec prisma migrate dev --name init   # create SQLite schema
pnpm seed                                               # init .context-repo + sample CPR
pnpm dev                                                # server :4000, web :3000
```

Then open **http://localhost:3000/pr/pr-001**.

## Test

```bash
pnpm --filter @context-studio/server test   # semantic-diff engine unit tests
```

## Layout

```
apps/web      Next.js 14 (App Router) — the UI, speaks domain language only
apps/server   Express + simple-git + Prisma — the abstracted version-control backend
packages/types  Shared domain types for both apps
```
