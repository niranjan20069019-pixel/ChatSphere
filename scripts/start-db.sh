#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGDATA="${ROOT}/.pgdata"
export PGPORT="${PGPORT:-5433}"
export PATH="/usr/lib/postgresql/16/bin:${PATH}"

if ! command -v initdb >/dev/null 2>&1 || ! command -v pg_ctl >/dev/null 2>&1; then
  echo "PostgreSQL binaries not found. Skipping local database start."
  echo "If DATABASE_URL does not point at a running database, run PostgreSQL yourself"
  echo "(e.g. 'docker compose up -d postgres') before starting the dev servers."
  exit 0
fi

if [ ! -d "$PGDATA" ]; then
  echo "Initializing local PostgreSQL in .pgdata ..."
  initdb -D "$PGDATA" --auth=trust --username=chatsphere
fi

if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "PostgreSQL already running on port ${PGPORT}"
else
  pg_ctl -D "$PGDATA" -o "-p ${PGPORT} -k /tmp" -l "${PGDATA}/logfile" start
  echo "PostgreSQL started on port ${PGPORT}"
fi

createdb -h /tmp -p "$PGPORT" -U chatsphere chatsphere 2>/dev/null || true
echo "DATABASE_URL=postgresql://chatsphere@localhost:${PGPORT}/chatsphere?host=/tmp&schema=public"
