#!/usr/bin/env bash
# Pull latest template and rebuild. Intended for servers with git + Node + Composer.
# Usage: bash scripts/template-self-update.sh [BRANCH]
# Default branch from arg, else UPDATE_GIT_BRANCH env, else Production.

set -euo pipefail

HOME="${HOME:-/root}"
export HOME

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${1:-${UPDATE_GIT_BRANCH:-Production}}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed." >&2
  exit 1
fi

if [[ ! -d "$ROOT/.git" ]]; then
  echo "Not a git checkout (no .git). Deploy updates with your normal process instead." >&2
  exit 1
fi

REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE_URL" == *rust-template-source* ]]; then
  echo "This checkout is the private source repo. Run update on a rust-template-prod install." >&2
  exit 1
fi

is_shipped_backend_addon() {
  case "$1" in
    ExampleAddon) return 0 ;;
    *) return 1 ;;
  esac
}

is_shipped_frontend_addon_page() {
  case "$1" in
    example-addon) return 0 ;;
    *) return 1 ;;
  esac
}

is_shipped_frontend_addon_component() {
  case "$1" in
    example-addon-admin-demo.tsx) return 0 ;;
    *) return 1 ;;
  esac
}

save_installed_addons() {
  local backup="$1"
  mkdir -p "$backup/Modules" "$backup/frontend-admin-addons" "$backup/frontend-addon-components" "$backup/frontend-addon-src"

  if [[ -d "$ROOT/backend/Modules" ]]; then
    local dir name
    for dir in "$ROOT/backend/Modules"/*; do
      [[ -d "$dir" ]] || continue
      name="$(basename "$dir")"
      if is_shipped_backend_addon "$name"; then
        continue
      fi
      cp -a "$dir" "$backup/Modules/$name"
    done
  fi

  if [[ -f "$ROOT/backend/modules_statuses.json" ]]; then
    cp -a "$ROOT/backend/modules_statuses.json" "$backup/modules_statuses.json"
  fi

  if [[ -d "$ROOT/frontend/src/app/admin/addons" ]]; then
    local dir name
    for dir in "$ROOT/frontend/src/app/admin/addons"/*; do
      [[ -e "$dir" ]] || continue
      name="$(basename "$dir")"
      if is_shipped_frontend_addon_page "$name"; then
        continue
      fi
      cp -a "$dir" "$backup/frontend-admin-addons/$name"
    done
  fi

  if [[ -d "$ROOT/frontend/src/components/addons" ]]; then
    local file name
    for file in "$ROOT/frontend/src/components/addons"/*; do
      [[ -e "$file" ]] || continue
      name="$(basename "$file")"
      if is_shipped_frontend_addon_component "$name"; then
        continue
      fi
      cp -a "$file" "$backup/frontend-addon-components/$name"
    done
  fi

  if [[ -d "$ROOT/frontend/src/addons" ]]; then
    local file name
    for file in "$ROOT/frontend/src/addons"/*; do
      [[ -e "$file" ]] || continue
      name="$(basename "$file")"
      if [[ "$name" == "registry.ts" || "$name" == "public-front.tsx" ]]; then
        continue
      fi
      cp -a "$file" "$backup/frontend-addon-src/$name"
    done
  fi
}

sync_installed_fronts() {
  local dir="$ROOT/frontend/src/addons"
  local imports="" names="" ids="" folder base source const_name front_id
  mkdir -p "$dir"
  shopt -s nullglob
  for folder in "$dir"/*; do
    [[ -d "$folder" && -f "$folder/front.tsx" ]] || continue
    base="$(basename "$folder")"
    [[ "$base" =~ ^[a-z0-9][a-z0-9_-]{0,40}$ ]] || continue
    source="$(cat "$folder/front.tsx")"
    const_name="$(printf '%s\n' "$source" | sed -n 's/^export const \([A-Za-z0-9_]*\).*/\1/p' | head -1)"
    front_id="$(printf '%s\n' "$source" | sed -n 's/.*id: *"\([a-z][a-z0-9_-]*\)".*/\1/p' | head -1)"
    [[ -n "$const_name" && -n "$front_id" ]] || continue
    imports="${imports}import { ${const_name} } from \"@/addons/${base}/front\"
"
    names="${names}${names:+, }${const_name}"
    ids="${ids}${ids:+, }\"${front_id}\""
  done
  shopt -u nullglob
  cat > "$dir/installed.ts" << EOF
"use client"

${imports}import type { PublicFrontDefinition } from "@/lib/public-front-types"

/** Site-owned public fronts. Template updates keep this file and the addon folders it imports. */
export const installedFronts: PublicFrontDefinition[] = [${names}]
EOF
  printf 'export const installedFrontIds = [%s] as const\n' "$ids" > "$dir/installed-ids.ts"
}

restore_installed_addons() {
  local backup="$1"
  local dir name file

  shopt -s nullglob
  for dir in "$backup/Modules"/*; do
    [[ -d "$dir" ]] || continue
    name="$(basename "$dir")"
    mkdir -p "$ROOT/backend/Modules"
    rm -rf "$ROOT/backend/Modules/$name"
    cp -a "$dir" "$ROOT/backend/Modules/$name"
  done

  for dir in "$backup/frontend-admin-addons"/*; do
    [[ -e "$dir" ]] || continue
    name="$(basename "$dir")"
    mkdir -p "$ROOT/frontend/src/app/admin/addons"
    rm -rf "$ROOT/frontend/src/app/admin/addons/$name"
    cp -a "$dir" "$ROOT/frontend/src/app/admin/addons/$name"
  done

  for file in "$backup/frontend-addon-components"/*; do
    [[ -e "$file" ]] || continue
    name="$(basename "$file")"
    mkdir -p "$ROOT/frontend/src/components/addons"
    rm -rf "$ROOT/frontend/src/components/addons/$name"
    cp -a "$file" "$ROOT/frontend/src/components/addons/$name"
  done

  for file in "$backup/frontend-addon-src"/*; do
    [[ -e "$file" ]] || continue
    name="$(basename "$file")"
    mkdir -p "$ROOT/frontend/src/addons"
    rm -rf "$ROOT/frontend/src/addons/$name"
    cp -a "$file" "$ROOT/frontend/src/addons/$name"
  done
  shopt -u nullglob

  if [[ -f "$backup/modules_statuses.json" && -f "$ROOT/backend/modules_statuses.json" ]]; then
    php -r '
      $dest = $argv[1];
      $savedPath = $argv[2];
      $modulesDir = $argv[3];
      $base = json_decode((string) file_get_contents($dest), true);
      $saved = json_decode((string) file_get_contents($savedPath), true);
      if (!is_array($base)) $base = [];
      if (!is_array($saved)) $saved = [];
      foreach ($saved as $name => $enabled) {
        if (!is_string($name) || $name === "") continue;
        if (is_dir($modulesDir . DIRECTORY_SEPARATOR . $name)) {
          $base[$name] = (bool) $enabled;
        }
      }
      file_put_contents($dest, json_encode($base, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    ' "$ROOT/backend/modules_statuses.json" "$backup/modules_statuses.json" "$ROOT/backend/Modules"
  elif [[ -f "$backup/modules_statuses.json" ]]; then
    cp -a "$backup/modules_statuses.json" "$ROOT/backend/modules_statuses.json"
  fi
}

echo "Fetching origin/${BRANCH}…"
git fetch origin "$BRANCH"

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git checkout "$BRANCH"
else
  git checkout -B "$BRANCH" "origin/${BRANCH}"
fi

ADDONS_BACKUP="$(mktemp -d)"
cleanup_addons_backup() { rm -rf "$ADDONS_BACKUP"; }
trap cleanup_addons_backup EXIT

echo "Saving installed addons…"
save_installed_addons "$ADDONS_BACKUP"

# Discard local edits to shipped files. Installed addons are restored after reset.
echo "Resetting to origin/${BRANCH}…"
git reset --hard "origin/${BRANCH}"

echo "Restoring installed addons…"
restore_installed_addons "$ADDONS_BACKUP"
sync_installed_fronts

resolve_bin() {
  local name="$1"
  shift
  local candidate
  for candidate in "$@"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  candidate="$(command -v "$name" 2>/dev/null || true)"
  if [[ -n "$candidate" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi
  return 1
}

COMPOSER_BIN="$(resolve_bin composer \
  "${COMPOSER:-}" \
  "${HOME}/.local/bin/composer" \
  /root/.local/bin/composer \
  /usr/local/bin/composer \
  /usr/bin/composer \
  || true)"

if [[ -f "$ROOT/backend/composer.json" ]]; then
  if [[ -n "$COMPOSER_BIN" ]]; then
    echo "composer install (backend)…"
    (cd "$ROOT/backend" && "$COMPOSER_BIN" install --no-dev --optimize-autoloader --no-interaction)
  elif [[ -f "$ROOT/backend/vendor/autoload.php" ]]; then
    echo "composer not on PATH; shipped vendor/ is present, skipping composer install."
  else
    echo "composer is not installed (try: curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer)." >&2
    exit 1
  fi
fi

if [[ -f "$ROOT/backend/artisan" ]]; then
  echo "php artisan migrate --force…"
  (cd "$ROOT/backend" && php artisan migrate --force)
  php "$ROOT/backend/artisan" config:clear
  php "$ROOT/backend/artisan" cache:clear
fi

NPM_BIN="$(resolve_bin npm \
  "${NPM:-}" \
  /usr/local/bin/npm \
  /usr/bin/npm \
  || true)"

if [[ -f "$ROOT/frontend/package.json" ]]; then
  if [[ -z "$NPM_BIN" ]]; then
    echo "npm is not installed." >&2
    exit 1
  fi
  echo "Stopping Next.js before the build replaces its files…"
  bash "$ROOT/frontend/scripts/restart-next.sh" stop
  echo "npm ci && npm run build (frontend)…"
  if ! (cd "$ROOT/frontend" && "$NPM_BIN" ci && "$NPM_BIN" run build) < /dev/null; then
    echo "Frontend build failed. Starting the previous Next.js process if a build is still on disk." >&2
    bash "$ROOT/frontend/scripts/restart-next.sh" || true
    exit 1
  fi
  echo "Restarting the site so the new pages are served…"
  bash "$ROOT/frontend/scripts/restart-next.sh"
fi

start_backend_if_down() {
  local port="${BACKEND_PORT:-8000}"
  local backend="$ROOT/backend"
  local pidfile="$ROOT/.rust-template-backend-serve.pid"
  local logf="$backend/storage/logs/install-artisan-serve.log"
  if [[ ! -f "$backend/artisan" ]]; then
    return 0
  fi
  if ss -H -ltn "sport = :${port}" 2>/dev/null | grep -q .; then
    echo "Backend is already listening on port ${port}."
    return 0
  fi
  echo "No backend process is listening on port ${port}. Starting it…"
  mkdir -p \
    "$backend/bootstrap/cache" \
    "$backend/storage/framework/cache/data" \
    "$backend/storage/framework/sessions" \
    "$backend/storage/framework/views" \
    "$backend/storage/logs"
  (
    cd "$backend"
    nohup php artisan serve --host=0.0.0.0 --port="$port" >>"$logf" 2>&1 &
    echo $! >"$pidfile"
  )
  local _
  for _ in $(seq 1 20); do
    if ss -H -ltn "sport = :${port}" 2>/dev/null | grep -q .; then
      echo "Backend is listening on port ${port}."
      return 0
    fi
    sleep 1
  done
  echo "Backend did not start listening on port ${port}. See ${logf}" >&2
  return 1
}

start_backend_if_down

nginx_site="/etc/nginx/sites-available/rust-template"
if [[ -f "$nginx_site" ]] && ! grep -q 'client_max_body_size' "$nginx_site"; then
  if [[ "$(id -u)" -eq 0 ]]; then
    sed -i '/server_name /a\    client_max_body_size 32m;' "$nginx_site"
    nginx -t && systemctl reload nginx || true
    echo "Raised nginx upload limit to 32 MB."
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo sed -i '/server_name /a\    client_max_body_size 32m;' "$nginx_site"
    sudo nginx -t && sudo systemctl reload nginx || true
    echo "Raised nginx upload limit to 32 MB."
  else
    echo "Uploads over 1 MB still need client_max_body_size 32m in ${nginx_site} (reload nginx)."
  fi
fi

if [[ -f "$ROOT/scripts/ensure-laravel-scheduler.sh" ]]; then
  bash "$ROOT/scripts/ensure-laravel-scheduler.sh" "$ROOT" || echo "Could not configure the Laravel scheduler." >&2
fi

echo "Self-update finished."
