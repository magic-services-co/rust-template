#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
PORT="${FRONTEND_PORT:-3000}"
LOCKDIR="$ROOT/backend/storage/framework/cache"
AGAIN="$LOCKDIR/frontend-rebuild.again"
MIN_FREE_KB=1572864

mkdir -p "$LOCKDIR"
exec 9>"$LOCKDIR/frontend-rebuild.lock"
if ! flock -n 9; then
  date -u +%Y-%m-%dT%H:%M:%SZ > "$AGAIN"
  echo "A frontend rebuild is already running. It will include this upload."
  exit 0
fi

echo "Frontend rebuild started at $(date -u +%Y-%m-%dT%H:%M:%SZ)."

remote="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
if [[ "$remote" == *rust-template-source* ]]; then
  echo "Source checkout; the dev server picks up frontend files without a production rebuild."
  exit 0
fi

ppid_of() {
  ps -o ppid= -p "$1" 2>/dev/null | tr -d ' '
}

cmdline() {
  tr '\0' ' ' < "/proc/$1/cmdline" 2>/dev/null || true
}

running_next_dev() {
  local pid i
  pid="$(ss -H -ltnp "sport = :${PORT}" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | head -1 || true)"
  i=0
  while [[ -n "$pid" && "$pid" != 0 && "$pid" != 1 && $i -lt 12 ]]; do
    if [[ "$(cmdline "$pid")" == *"next dev"* ]]; then
      return 0
    fi
    pid="$(ppid_of "$pid")"
    i=$((i + 1))
  done
  return 1
}

if running_next_dev; then
  echo "Frontend is next dev; it will pick up the files without a production rebuild."
  exit 0
fi

if [[ ! -f "$FRONTEND/package.json" ]]; then
  echo "No frontend package is installed." >&2
  exit 1
fi
if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo "Frontend dependencies are not installed." >&2
  exit 1
fi
NPM_BIN="$(command -v npm || true)"
if [[ -z "$NPM_BIN" ]]; then
  echo "npm is not installed." >&2
  exit 1
fi

restore_previous() {
  local previous="$1"
  if [[ -d "$previous" ]]; then
    echo "Putting the previous frontend back…" >&2
    rm -rf "$FRONTEND/.next"
    mv "$previous" "$FRONTEND/.next"
    bash "$FRONTEND/scripts/restart-next.sh" || true
  fi
}

build_and_swap() {
  local avail_kb stage previous
  avail_kb="$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')"
  if [[ "${avail_kb:-0}" -lt "$MIN_FREE_KB" ]]; then
    echo "Not enough free disk to rebuild the frontend. About 1.5 GB free is required; $(df -h "$ROOT" | awk 'NR==2 {print $4 " is free on " $6}')." >&2
    return 1
  fi

  find "$ROOT" -maxdepth 1 -type d -name '.addon-frontend-build.*' -exec rm -rf {} + 2>/dev/null || true
  stage="$(mktemp -d "$ROOT/.addon-frontend-build.XXXXXX")"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude node_modules \
      --exclude .next \
      --exclude .next-previous \
      --exclude node_modules-previous \
      --exclude install-next-start.log \
      --exclude addon-frontend-build.log \
      "$FRONTEND/" "$stage/"
  else
    tar -C "$FRONTEND" \
      --exclude=node_modules \
      --exclude=.next \
      --exclude=.next-previous \
      --exclude=node_modules-previous \
      --exclude=install-next-start.log \
      --exclude=addon-frontend-build.log \
      -cf - . | tar -C "$stage" -xf -
  fi
  ln -s "$FRONTEND/node_modules" "$stage/node_modules"

  echo "Building the frontend beside the live site. The current site stays up."
  if ! (
    cd "$stage" &&
    TEMPLATE_UPDATE_SKIP_TYPECHECK=1 "$NPM_BIN" exec -- next build
  ) < /dev/null; then
    echo "Frontend build failed. The current site was left running." >&2
    rm -rf "$stage"
    return 1
  fi
  if [[ ! -f "$stage/.next/BUILD_ID" ]]; then
    echo "Frontend build did not produce a build. The current site was left running." >&2
    rm -rf "$stage"
    return 1
  fi
  if [[ -f "$AGAIN" ]]; then
    rm -rf "$stage"
    return 0
  fi

  echo "New frontend is built. Switching the live site over to it…"
  bash "$FRONTEND/scripts/restart-next.sh" stop
  if ss -H -ltn "sport = :${PORT}" 2>/dev/null | grep -q .; then
    echo "Next.js is still listening, so the new build was not swapped in." >&2
    rm -rf "$stage"
    return 1
  fi

  previous="$FRONTEND/.next-previous"
  rm -rf "$previous"
  if [[ -d "$FRONTEND/.next" ]]; then
    mv "$FRONTEND/.next" "$previous"
  fi
  if ! mv "$stage/.next" "$FRONTEND/.next"; then
    restore_previous "$previous"
    rm -rf "$stage"
    return 1
  fi
  rm -rf "$stage"
  if ! bash "$FRONTEND/scripts/restart-next.sh"; then
    restore_previous "$previous"
    return 1
  fi
  rm -rf "$previous"
  return 0
}

attempt=0
while true; do
  attempt=$((attempt + 1))
  if [[ "$attempt" -gt 3 ]]; then
    echo "Stopped after 3 frontend rebuilds." >&2
    exit 1
  fi
  rm -f "$AGAIN"
  if ! build_and_swap; then
    if [[ -f "$AGAIN" ]]; then
      echo "Frontend changed during the failed build. Starting again."
      continue
    fi
    exit 1
  fi
  if [[ -f "$AGAIN" ]]; then
    echo "Frontend changed during the rebuild. Starting again."
    continue
  fi
  echo "Frontend rebuild finished."
  exit 0
done
