#!/usr/bin/env bash
# Restart a production `next start` after a build so new pages are served.
# If nothing is listening, start it. `next dev` is left running.
#
# Usage: restart-next.sh [restart|stop]
# `stop` only stops a production server. The self-update script does that
# before `next build`, which deletes `.next` out from under a running server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND="$ROOT/frontend"
PORT="${FRONTEND_PORT:-3000}"
PIDFILE="$ROOT/.rust-template-frontend-serve.pid"
BUILD_STAMP="$ROOT/.rust-template-frontend-build-id"
LOG="$FRONTEND/install-next-start.log"
LOCKDIR="$ROOT/backend/storage/framework/cache"
ACTION="${1:-restart}"

if [[ "$ACTION" != "restart" && "$ACTION" != "stop" ]]; then
  echo "Usage: $0 [restart|stop]" >&2
  exit 1
fi

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

if [[ -f "$ROOT/scripts/ensure-laravel-scheduler.sh" ]]; then
  bash "$ROOT/scripts/ensure-laravel-scheduler.sh" "$ROOT" || echo "Could not configure the Laravel scheduler." >&2
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

# /proc/<pid> mtime is not the process start time, so it cannot be compared
# to BUILD_ID. Remember the id we actually started.
disk_build_id() {
  tr -d ' \n\r' < "$FRONTEND/.next/BUILD_ID"
}

remember_build() {
  if [[ -f "$FRONTEND/.next/BUILD_ID" ]]; then
    disk_build_id > "$BUILD_STAMP"
    echo >> "$BUILD_STAMP"
  fi
}

# npm is the parent of `sh -c next start`, which is the parent of next-server.
# Killing only the listener leaves the parent in place and the port can stay open.
service_root() {
  local current="$1"
  local top="$1"
  local i=0
  local parent cmd
  while [[ $i -lt 12 ]]; do
    parent="$(ppid_of "$current")"
    if [[ -z "$parent" || "$parent" == 0 || "$parent" == 1 ]]; then
      break
    fi
    cmd="$(cmdline "$parent")"
    if [[ "$cmd" == *npm\ run\ start* || "$cmd" == *"next start"* || "$cmd" == next-server* ]]; then
      top="$parent"
      current="$parent"
    else
      break
    fi
    i=$((i + 1))
  done
  printf '%s\n' "$top"
}

kill_tree() {
  local current="$1"
  local child
  for child in $(ps -o pid= --ppid "$current" 2>/dev/null); do
    kill_tree "$child"
  done
  kill "$current" 2>/dev/null || true
}

stop_frontend() {
  local target="$1"
  target="$(service_root "$target")"
  if is_ancestor_of_self "$target"; then
    echo "Refusing to stop the process that is building the frontend."
    exit 0
  fi
  echo "Stopping Next.js on port ${PORT}…"
  kill_tree "$target"
  sleep 1
  if kill -0 "$target" 2>/dev/null; then
    kill -9 "$target" 2>/dev/null || true
  fi
  local listen
  listen="$(listener_pid || true)"
  if [[ -n "$listen" ]]; then
    kill -9 "$(service_root "$listen")" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$BUILD_STAMP"
}

start_frontend() {
  local NPM_BIN
  NPM_BIN="$(command -v npm || true)"
  if [[ -z "$NPM_BIN" ]]; then
    echo "npm is not installed; cannot start Next.js." >&2
    exit 1
  fi
  if [[ ! -f "$FRONTEND/.next/BUILD_ID" ]]; then
    echo "No production frontend build yet."
    exit 0
  fi
  echo "Starting Next.js on port ${PORT}…"
  (
    cd "$FRONTEND"
    nohup "$NPM_BIN" run start -- --hostname 0.0.0.0 --port "$PORT" >>"$LOG" 2>&1 9>&- &
    echo $! >"$PIDFILE"
  )
  local _
  for _ in $(seq 1 30); do
    if [[ -n "$(listener_pid || true)" ]]; then
      remember_build
      echo "Frontend is listening on port ${PORT}."
      exit 0
    fi
    sleep 1
  done
  echo "Frontend did not start listening on port ${PORT}. See ${LOG}" >&2
  exit 1
}

if [[ "$ACTION" == "restart" && ! -f "$FRONTEND/.next/BUILD_ID" ]]; then
  echo "No production frontend build yet."
  exit 0
fi

listener="$(listener_pid || true)"
pid="$listener"
if [[ -z "$pid" && -f "$PIDFILE" ]]; then
  pid="$(tr -d ' \n\r' < "$PIDFILE" || true)"
  if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
    pid=""
  fi
fi

if [[ -n "$listener" && -f "$PIDFILE" ]]; then
  file_pid="$(tr -d ' \n\r' < "$PIDFILE" || true)"
  if [[ -n "$file_pid" ]] && kill -0 "$file_pid" 2>/dev/null; then
    root_pid="$(service_root "$listener")"
    if [[ "$file_pid" == "$listener" || "$file_pid" == "$root_pid" ]]; then
      pid="$root_pid"
    fi
  fi
fi

if [[ -z "$pid" ]]; then
  if [[ "$ACTION" == "stop" ]]; then
    rm -f "$BUILD_STAMP"
    echo "Frontend is not running."
    exit 0
  fi
  echo "No frontend process is listening on port ${PORT}."
  start_frontend
fi

if chain_matches "$pid" "next dev"; then
  echo "Frontend is next dev; not restarting."
  exit 0
fi

production=0
if chain_matches "$pid" "next start" || chain_matches "$pid" "npm run start"; then
  production=1
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

if [[ "$ACTION" == "stop" ]]; then
  stop_frontend "$pid"
  echo "Frontend stopped."
  exit 0
fi

disk_id="$(disk_build_id)"
stamp_id=""
if [[ -f "$BUILD_STAMP" ]]; then
  stamp_id="$(tr -d ' \n\r' < "$BUILD_STAMP" || true)"
fi
if [[ -n "$stamp_id" && "$stamp_id" == "$disk_id" ]]; then
  echo "Frontend is already running this build."
  exit 0
fi

echo "Restarting Next.js so build ${disk_id} is served…"
stop_frontend "$pid"
start_frontend
