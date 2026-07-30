#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGDATA="${ROOT}/.pgdata"
export PGPORT="${PGPORT:-5433}"
export PATH="/usr/lib/postgresql/16/bin:${PATH}"

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
