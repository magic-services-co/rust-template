#!/usr/bin/env bash
# Restart a production `next start` after a build so new pages are served.
# `next dev` is left running. Exits 0 when there is nothing to restart.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND="$ROOT/frontend"
PORT="${FRONTEND_PORT:-3000}"
PIDFILE="$ROOT/.rust-template-frontend-serve.pid"
LOG="$FRONTEND/install-next-start.log"
LOCKDIR="$ROOT/backend/storage/framework/cache"

mkdir -p "$LOCKDIR"
exec 9>"$LOCKDIR/frontend-restart.lock"
if ! flock -n 9; then
  echo "Frontend restart already in progress."
  exit 0
fi

remote="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
if [[ "$remote" == *rust-template-source* ]]; then
  echo "Source checkout; not restarting the dev server."
  exit 0
fi

if [[ ! -f "$FRONTEND/.next/BUILD_ID" ]]; then
  echo "No production frontend build yet."
  exit 0
fi

ppid_of() {
  ps -o ppid= -p "$1" 2>/dev/null | tr -d ' '
}

cmdline() {
  tr '\0' ' ' < "/proc/$1/cmdline" 2>/dev/null || true
}

listener_pid() {
  ss -H -ltnp "sport = :${PORT}" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | head -1
}

chain_matches() {
  local pid="$1"
  local needle="$2"
  local i=0
  while [[ -n "$pid" && "$pid" != 0 && "$pid" != 1 && $i -lt 12 ]]; do
    if [[ "$(cmdline "$pid")" == *"$needle"* ]]; then
      return 0
    fi
    pid="$(ppid_of "$pid")"
    i=$((i + 1))
  done
  return 1
}

is_ancestor_of_self() {
  local target="$1"
  local self="$$"
  local i=0
  while [[ -n "$self" && "$self" != 0 && "$self" != 1 && $i -lt 15 ]]; do
    if [[ "$self" == "$target" ]]; then
      return 0
    fi
    self="$(ppid_of "$self")"
    i=$((i + 1))
  done
  return 1
}

pid="$(listener_pid || true)"
if [[ -z "$pid" && -f "$PIDFILE" ]]; then
  pid="$(tr -d ' \n\r' < "$PIDFILE" || true)"
  if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
    pid=""
  fi
fi

if [[ -z "$pid" ]]; then
  echo "No frontend process is listening on port ${PORT}."
  exit 0
fi

if chain_matches "$pid" "next dev"; then
  echo "Frontend is next dev; not restarting."
  exit 0
fi

production=0
if chain_matches "$pid" "next start" || chain_matches "$pid" "npm run start"; then
  production=1
fi
if [[ -f "$PIDFILE" ]]; then
  file_pid="$(tr -d ' \n\r' < "$PIDFILE" || true)"
  if [[ -n "$file_pid" ]] && kill -0 "$file_pid" 2>/dev/null && ! is_ancestor_of_self "$file_pid"; then
    production=1
    pid="$file_pid"
  fi
fi
if [[ "$production" -ne 1 ]]; then
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  cmd="$(cmdline "$pid")"
  if [[ "$cmd" == next-server* && ( "$cwd" == "$FRONTEND" || "$cwd" == "$FRONTEND/.next" ) ]]; then
    production=1
  fi
fi

if [[ "$production" -ne 1 ]]; then
  echo "Port ${PORT} is not the template Next.js server; not restarting."
  exit 0
fi

if is_ancestor_of_self "$pid"; then
  echo "Refusing to stop the process that is building the frontend."
  exit 0
fi

build_mtime="$(stat -c %Y "$FRONTEND/.next/BUILD_ID")"
proc_mtime="$(stat -c %Y "/proc/$pid" 2>/dev/null || echo 0)"
if [[ "$proc_mtime" -ge "$build_mtime" ]]; then
  echo "Frontend is already running this build."
  exit 0
fi

echo "Restarting Next.js so the new build is served…"

kill_tree() {
  local current="$1"
  local child
  for child in $(ps -o pid= --ppid "$current" 2>/dev/null); do
    kill_tree "$child"
  done
  kill "$current" 2>/dev/null || true
}

kill_tree "$pid"
listen="$(listener_pid || true)"
if [[ -n "$listen" && "$listen" != "$pid" ]]; then
  kill_tree "$listen"
fi
sleep 1
if kill -0 "$pid" 2>/dev/null; then
  kill -9 "$pid" 2>/dev/null || true
fi
listen="$(listener_pid || true)"
if [[ -n "$listen" ]]; then
  kill -9 "$listen" 2>/dev/null || true
  sleep 1
fi

NPM_BIN="$(command -v npm || true)"
if [[ -z "$NPM_BIN" ]]; then
  echo "npm is not installed; cannot start Next.js." >&2
  exit 1
fi

(
  cd "$FRONTEND"
  nohup "$NPM_BIN" run start -- --hostname 0.0.0.0 --port "$PORT" >>"$LOG" 2>&1 &
  echo $! >"$PIDFILE"
)

for _ in $(seq 1 30); do
  if [[ -n "$(listener_pid || true)" ]]; then
    echo "Frontend is listening on port ${PORT}."
    exit 0
  fi
  sleep 1
done

echo "Frontend did not start listening on port ${PORT}. See ${LOG}" >&2
exit 1
