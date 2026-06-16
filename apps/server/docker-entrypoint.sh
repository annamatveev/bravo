#!/bin/sh
# Apply DB migrations, seed demo data once, then start the server.
set -e
cd /app/apps/server

echo "[entrypoint] applying migrations…"
pnpm exec prisma migrate deploy

# Seed demo data on first boot only (marker lives on the /data volume).
# Set SEED=0 to skip seeding entirely.
if [ "${SEED:-1}" != "0" ] && [ ! -f /data/.seeded ]; then
  echo "[entrypoint] seeding demo data…"
  pnpm seed
  touch /data/.seeded
fi

echo "[entrypoint] starting server on :${PORT:-4000}…"
exec pnpm exec tsx src/index.ts
