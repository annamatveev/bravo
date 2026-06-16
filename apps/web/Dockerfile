# Context Studio — web image (Next.js).
# NEXT_PUBLIC_API_BASE is inlined at build time (browser-facing). The SSR
# internal base (API_INTERNAL_BASE) is provided at runtime via compose.

FROM node:20-bookworm-slim AS build
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/types/package.json packages/types/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN pnpm install --filter "@context-studio/web..." --frozen-lockfile

COPY packages/types ./packages/types
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_BASE=http://localhost:4000
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @context-studio/web build

# --- runtime -------------------------------------------------------------
FROM node:20-bookworm-slim AS run
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
