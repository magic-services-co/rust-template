#!/usr/bin/env bash
# Shared production Next.js build.
#
# Source this file, then call frontend_build_prepare and frontend_next_build
# from the directory that should receive .next. That directory must be a copy
# beside the live site. next build writes .next in the current directory, and
# `npm run build` also restarts the server, so callers invoke next directly.
#
# Running this file executes a build in the current directory.

frontend_rebuild_marker() {
  local root="$1"
  printf '%s/.frontend-rebuild-needed' "$root"
}

frontend_rebuild_mark_needed() {
  local root="$1"
  local reason="$2"
  printf '%s\n' "$reason" > "$(frontend_rebuild_marker "$root")"
}

frontend_rebuild_mark_done() {
  rm -f "$(frontend_rebuild_marker "$1")"
}

frontend_meminfo_kb() {
  local key="$1"
  awk -v key="$key" '$1 == key { print $2; exit }' /proc/meminfo 2>/dev/null || true
}

# Sets CI and a heap limit that leaves room for the site that is still running.
# Returns 1 when starting a build would risk the kernel killing the machine.
frontend_build_prepare() {
  export CI=1
  export NEXT_TELEMETRY_DISABLED=1
  unset __NEXT_AGENT_UPGRADE || true

  if [[ ! -r /proc/meminfo ]]; then
    if [[ -z "${NODE_OPTIONS:-}" ]]; then
      export NODE_OPTIONS="--max-old-space-size=1536"
    fi
    echo "Node heap limit: ${NODE_OPTIONS}"
    return 0
  fi

  local avail_kb swap_kb reserve_kb min_heap_kb usable_kb heap_mb
  avail_kb="$(frontend_meminfo_kb MemAvailable:)"
  swap_kb="$(frontend_meminfo_kb SwapFree:)"
  avail_kb="${avail_kb:-0}"
  swap_kb="${swap_kb:-0}"
  # Keep the live Next server and the OS off the build heap.
  reserve_kb=524288
  min_heap_kb=1048576
  usable_kb=$((avail_kb + swap_kb - reserve_kb))
  if [[ "$usable_kb" -lt "$min_heap_kb" ]]; then
    echo "Not enough memory to build the frontend. Free memory is $((avail_kb / 1024)) MB and free swap is $((swap_kb / 1024)) MB." >&2
    echo "The live site was not changed. Add about 2 GB of swap, or free memory, then rebuild the frontend from Admin → Update." >&2
    echo "Example: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile" >&2
    return 1
  fi

  heap_mb=$((usable_kb / 1024))
  if [[ "$heap_mb" -gt 2048 ]]; then
    heap_mb=2048
  fi
  if [[ "$heap_mb" -lt 1024 ]]; then
    heap_mb=1024
  fi
  if [[ -z "${NODE_OPTIONS:-}" ]]; then
    export NODE_OPTIONS="--max-old-space-size=${heap_mb}"
  fi
  echo "Node heap limit is ${heap_mb} MB. Free memory is $((avail_kb / 1024)) MB and free swap is $((swap_kb / 1024)) MB."
  echo "The Next.js security upgrade prompt is disabled. A build must not replace the live site to upgrade Next."
}

frontend_next_build() {
  local npm_bin="${1:-${NPM_BIN:-npm}}"
  # stdin is not a terminal, and CI=1, so Next cannot open the upgrade menu.
  # That menu runs `next upgrade`, which deletes .next before the new build exists.
  TEMPLATE_UPDATE_SKIP_TYPECHECK=1 "$npm_bin" exec --no -- next build < /dev/null
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -euo pipefail
  frontend_build_prepare
  frontend_next_build "$(command -v npm)"
fi
