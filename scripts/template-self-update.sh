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
      if [[ "$name" == "registry.ts" ]]; then
        continue
      fi
      cp -a "$file" "$backup/frontend-addon-src/$name"
    done
  fi
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
  echo "npm ci && npm run build (frontend)…"
  (cd "$ROOT/frontend" && "$NPM_BIN" ci && "$NPM_BIN" run build)
  echo "Restarting the site so the new pages are served…"
  bash "$ROOT/frontend/scripts/restart-next.sh"
fi

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

echo "Self-update finished."
