#!/usr/bin/env bash
# ===========================================================================
#  Run the RLS suite against a throwaway PostgreSQL instance.
#
#  This does NOT touch any Supabase project. It builds an empty database,
#  applies db/test/00-shim.sql (stand-ins for the auth and storage schemas
#  Supabase provides, plus Supabase's default grants), applies the real
#  db/tenant-schema.sql on top, and then checks that a member cannot do the
#  things the schema says they cannot.
#
#  Needs a PostgreSQL 14+ server binary. Point PGBIN at it if it is not on the
#  path -- on Debian/Ubuntu that is /usr/lib/postgresql/<version>/bin.
#
#      db/test/run.sh
# ===========================================================================
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(dirname "$(dirname "$here")")"

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)}"
[ -n "${PGBIN:-}" ] && export PATH="$PGBIN:$PATH"
command -v initdb >/dev/null || { echo "initdb not found; set PGBIN"; exit 1; }

port="${PGPORT_TEST:-5433}"
data="$(mktemp -d)/pgdata"
sock="$(mktemp -d)"

# The server refuses to run as root, so hand the cluster to an unprivileged
# user when the suite is invoked by one.
runner=""
if [ "$(id -u)" = "0" ]; then
  id -u odtest >/dev/null 2>&1 || useradd -m odtest
  runner="odtest"
  mkdir -p "$data" && chown -R odtest "$(dirname "$data")" "$sock"
  chmod 700 "$data"
fi
# su does not carry the caller's PATH, so the server binaries are named again.
run() { if [ -n "$runner" ]; then su "$runner" -c "export PATH='$PATH'; $1"; else bash -c "$1"; fi; }

cleanup() {
  run "pg_ctl -D $data stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$(dirname "$data")" "$sock"
}
trap cleanup EXIT

echo "==> initialising a scratch cluster"
run "initdb -D $data -U postgres -A trust" >/dev/null
run "pg_ctl -D $data -o '-p $port -k $sock -c listen_addresses=' -l $data/server.log start" >/dev/null

psql() { command psql -h "$sock" -p "$port" -U postgres -X -v ON_ERROR_STOP=1 "$@"; }

# The two schemas each install a trigger on auth.users, so they get a database
# apiece rather than fighting over one.
command psql -h "$sock" -p "$port" -U postgres -X -q -c "create database tenant" >/dev/null
command psql -h "$sock" -p "$port" -U postgres -X -q -c "create database control" >/dev/null

# --------------------------------------------------------------- tenant ----
echo "==> tenant: applying the Supabase shim"
psql -d tenant -q -f "$here/00-shim.sql" >/dev/null

echo "==> tenant: applying db/tenant-schema.sql"
psql -d tenant -q -f "$repo/db/tenant-schema.sql" >/dev/null 2>&1

echo "==> tenant: applying it a SECOND time (re-running is the upgrade path)"
psql -d tenant -q -f "$repo/db/tenant-schema.sql" >/dev/null 2>&1

echo "==> tenant: running the suite"
psql -d tenant -q -f "$here/01-helpers.sql" >/dev/null
psql -d tenant -q -f "$here/02-rls-tests.sql"

# -------------------------------------------------------------- control ----
echo
echo "==> control plane: applying the Supabase shim"
psql -d control -q -f "$here/00-shim.sql" >/dev/null

echo "==> control plane: applying db/control-plane.sql"
psql -d control -q -f "$repo/db/control-plane.sql" >/dev/null 2>&1

echo "==> control plane: applying it a SECOND time"
psql -d control -q -f "$repo/db/control-plane.sql" >/dev/null 2>&1

echo "==> control plane: running the suite"
psql -d control -q -f "$here/01-helpers.sql" >/dev/null
psql -d control -q -f "$here/03-control-plane-tests.sql"
