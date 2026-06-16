# Context Studio — backend image.
# Runs the Express + Prisma + simple-git server. Needs the real `git` binary
# and openssl (Prisma). Runs via tsx so the workspace TS (incl. @context-studio/
# types source) executes without a separate emit step.

FROM node:20-bookworm-slim

# git: the backend shells out to it. openssl: required by Prisma engines.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# --- deps (cached on manifest changes) -----------------------------------
# Copy every workspace manifest so the lockfile validates, then install only
# the server's dependency closure.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/types/package.json packages/types/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN pnpm install --filter "@context-studio/server..." --frozen-lockfile

# --- source --------------------------------------------------------------
COPY packages/types ./packages/types
COPY apps/server ./apps/server
RUN pnpm --filter @context-studio/server exec prisma generate

ENV NODE_ENV=production PORT=4000
EXPOSE 4000

COPY apps/server/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
WORKDIR /app/apps/server
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
