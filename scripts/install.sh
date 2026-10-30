#!/usr/bin/env bash
#
# Magic Rust Template — full local install.
#
# ── Default one-liner (Docker MariaDB + clone magic-services-co/rust-template-prod):
#   sudo bash -c "$(curl -fsSL https://magicservices.co/rust-template/install.sh)"
#
# Override clone URL:  RUST_TEMPLATE_REPO=https://github.com/other/fork.git
# Override DB:         RUST_TEMPLATE_USE_DOCKER_DB=0  plus  --db-url mysql://…  (or only --db-url; it wins)
#
# ── Pipe form (explicit flags):
#   curl -fsSL https://magicservices.co/rust-template/install.sh | sudo bash -s -- --db-url mysql://…
#
# Interactive installs use whiptail when available; otherwise ANSI section headers (Spartan-style).

set -e

SCRIPT_VERSION="1.4.4"
INSTALL_TITLE="Magic Rust Template Installer"

WHITE=$'\e[0;37m'
GRAY=$'\e[1;30m'
RED=$'\e[0;31m'
GREEN=$'\e[0;32m'
YELLOW=$'\e[1;33m'
BLUE=$'\e[0;34m'
PURPLE=$'\e[0;35m'
CYAN=$'\e[0;36m'
L_CYAN=$'\e[1;36m'
NC=$'\e[0m'

STEP_COUNTER=1
exec 3>&1

ui_ts() { date +"%Y-%m-%d %H:%M:%S"; }
ui_hr() {
    echo -e "${BLUE}---------------------------------------------------------------------${NC}" >&2
}
ui_section() {
    ui_hr
    echo -e "${GRAY}[$(ui_ts)]${NC} ${WHITE}>>>${NC} ${CYAN}$*${NC}" >&2
    ui_hr
}
ui_step() {
    echo -e "\n${BLUE}=====================================================================${NC}\n" >&2
    echo -e "${GRAY}[$(ui_ts)]${NC} ${WHITE}>>>${NC} ${YELLOW}STEP ${STEP_COUNTER}: $*${NC}" >&2
    echo -e "\n${BLUE}=====================================================================${NC}\n" >&2
    STEP_COUNTER=$((STEP_COUNTER + 1))
}
DEFAULT_INSTALL_DIR="/var/www/rust-template"
DEFAULT_RUST_TEMPLATE_REPO="https://github.com/magic-services-co/rust-template-prod.git"
DOCKER_MYSQL_CONTAINER="rust-template-mysql"
DOCKER_MYSQL_IMAGE="${DOCKER_MYSQL_IMAGE:-mariadb:11}"
DOCKER_MYSQL_PORT="${DOCKER_MYSQL_PORT:-3307}"
DOCKER_DB_NAME="${DOCKER_DB_NAME:-templatephp}"
DOCKER_DB_USER="${DOCKER_DB_USER:-template}"
DOCKER_DB_PASS="${DOCKER_DB_PASS:-}"

REPO_URL="${RUST_TEMPLATE_REPO:-}"
BRANCH="${RUST_TEMPLATE_BRANCH:-Production}"
TARGET_DIR=""
USE_DOCKER_DB=1
if [[ "${RUST_TEMPLATE_USE_DOCKER_DB:-}" =~ ^(0|false|no)$ ]]; then
    USE_DOCKER_DB=0
fi
DB_URL_INPUT=""
SKIP_SYSTEM=0
SKIP_FRONTEND_BUILD=0
SKIP_START_SERVERS=0
BACKEND_URL_ARG=""
FRONTEND_URL_ARG=""
PAYNOW_KEY_ARG=""
STEAM_SECRET_ARG=""
SKIP_IONCUBE=0
FORCE_IONCUBE=0
SKIP_NGINX=0
INSTALL_SKIP_SSL=0
CERTBOT_EMAIL_ARG=""
INSTALL_PUBLIC_FRONTEND_URL_RESULT=""
INTERNAL_LARAVEL_URL="http://127.0.0.1:8000"
usage() {
    cat <<'EOF'
Usage: install.sh [options]

  --repo URL          Git clone URL (default: magic-services-co/rust-template-prod if not in tree; override with RUST_TEMPLATE_REPO)
  --branch NAME       Git branch (default: Production, or RUST_TEMPLATE_BRANCH)
  --dir PATH          Install / use this directory (default: /var/www/rust-template when cloning)
  --docker-db         Use Docker MariaDB (default on; redundant unless you used --no-docker-db)
  --no-docker-db      Do not use Docker DB (must use --db-url or the install will stop at database setup)
  --db-url URL        mysql://user:pass@host:port/database (implies no Docker DB for this run)
  --ioncube           Always try to install ionCube Loader (Debian/Ubuntu + sudo)
  --skip-ioncube      Never install ionCube Loader
  --skip-system       Do not try to install OS packages (apt)
  --no-frontend-build Skip `npm run build` (faster; run later in frontend/)
  --skip-start-servers Do not start Laravel / Next.js after install (use with systemd, etc.)
  --no-nginx          Do not install/configure nginx reverse proxy (see INSTALL_* below)
  --skip-ssl          With nginx: obtain no Let’s Encrypt cert (HTTP only on port 80)
  --certbot-email ADDR  Email for Let’s Encrypt registration (non-interactive SSL)
  --backend-url URL  Ignored (backward compatibility). Laravel stays at http://127.0.0.1:8000 for this install.
  --frontend-url URL Public site URL — what users open in the browser (non-interactive)
  --paynow-key KEY   Optional: pre-fill PAYNOW_KEY in .env (normally use /setup wizard)
  --steam-secret KEY Optional: pre-fill STEAM_SECRET in .env (normally use /setup wizard)
  --help              Show this help

Environment:
  RUST_TEMPLATE_REPO   Same as --repo (default prod repo if not in template tree)
  RUST_TEMPLATE_BRANCH Same as --branch
  RUST_TEMPLATE_USE_DOCKER_DB  Set to 0/false/no to skip Docker MariaDB (use --db-url)
  DOCKER_DB_PASS               App user password for Docker MariaDB (omit for random hex on new container; when reusing an existing container, read from .install-docker-mysql / backend/.env or set explicitly)
  INSTALL_IONCUBE=1     Same as --ioncube
  CI=1                  Disables interactive prompts (whiptail / read); use INSTALL_* env vars
  INSTALL_BACKEND_URL   Ignored if set (backward compatibility). Use INSTALL_FRONTEND_URL only.
  INSTALL_FRONTEND_URL  Non-interactive: full URL or bare IP (defaults port 3000)
  INSTALL_PAYNOW_KEY    Optional: pre-fill PayNow in .env (otherwise configure in /setup)
  INSTALL_STEAM_SECRET  Optional: pre-fill Steam API key in .env (otherwise configure in /setup)
  INSTALL_SKIP_SSL=1    Same as --skip-ssl
  INSTALL_CERTBOT_EMAIL Let’s Encrypt / certbot registration email (required for SSL when CI=1)
  INSTALL_CLOUDFLARE_PROXY  (optional) 1/true = note Cloudflare proxy in logs; detection is automatic
  SKIP_NGINX=1          Same as --no-nginx

Domain installs (hostname is not a bare IP and not localhost): installs nginx as a reverse proxy to
Next.js on 127.0.0.1:3000, adds Cloudflare published IP ranges for real_ip (CF-Connecting-IP), runs
certbot when possible, writes ${ROOT}/.install-domain-token, and may switch public URLs to https.

On a TTY (and CI unset), the installer asks only for the public site (frontend) URL. Laravel is always
configured at http://127.0.0.1:8000 in .env (Next.js on this server talks to it locally). A bare IP
like 192.168.1.10 becomes http://192.168.1.10:3000 for the site URL.
NEXTAUTH_SECRET is kept identical in backend/.env and frontend/.env.

PayNow and Steam are configured in the site setup wizard (/setup on your site URL), not by this installer.
Optional: --paynow-key / --steam-secret or INSTALL_PAYNOW_KEY / INSTALL_STEAM_SECRET to pre-seed .env.
Copying data from an older MySQL install of this template is done in /setup (Previous install step), not here.

After install, Laravel and Next.js start in production style (0.0.0.0) unless --skip-start-servers.

When run as root (or with sudo), installs a per-minute cron job: cd ${ROOT}/backend && php artisan schedule:run
(template auto-update, server automations, etc.) for the backend directory owner (or www-data).

Examples:
  sudo bash -c "$(curl -fsSL https://magicservices.co/rust-template/install.sh)"

  RUST_TEMPLATE_REPO=https://github.com/other/fork.git sudo bash -c "$(curl -fsSL https://magicservices.co/rust-template/install.sh)"

  curl -fsSL https://magicservices.co/rust-template/install.sh | sudo bash -s -- --db-url mysql://user:pass@127.0.0.1:3306/dbname
EOF
}

log() { echo -e "${GREEN}✔${NC} ${WHITE}$*${NC}" >&2; }
warn() { ui_hr; echo -e "${YELLOW}Warning:${NC} $*" >&2; ui_hr; }
die() { ui_hr; echo -e "${RED}ERROR:${NC} $*" >&2; ui_hr; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

use_whiptail_ui() {
    [[ -z "${CI:-}" ]] || return 1
    [[ -t 0 ]] && [[ -t 1 ]] || return 1
    [[ -r /dev/tty ]] || return 1
    need_cmd whiptail
}

ui_inputbox() {
    local text="$1"
    local h="$2"
    local w="$3"
    local def="$4"
    if use_whiptail_ui; then
        whiptail --title "$INSTALL_TITLE" --inputbox "$text" "$h" "$w" "$def" 3>&1 1>&2 2>&3 </dev/tty
    else
        ui_section "$text"
        local _line
        printf '%bDefault [%s]: %b' "$GRAY" "$def" "$NC" >&2
        read -r _line || true
        if [[ -z "${_line// }" ]]; then
            printf '%s' "$def"
        else
            printf '%s' "$_line"
        fi
    fi
}

ui_passwordbox() {
    local text="$1"
    local h="$2"
    local w="$3"
    if use_whiptail_ui; then
        whiptail --title "$INSTALL_TITLE" --passwordbox "$text" "$h" "$w" 3>&1 1>&2 2>&3 </dev/tty
    else
        ui_section "$text"
        local _line
        read -r -s _line || true
        echo >&2
        printf '%s' "$_line"
    fi
}

ui_msg_ok() {
    local text="$1"
    if use_whiptail_ui; then
        whiptail --title "$INSTALL_TITLE" --msgbox "$text" 12 70 3>&1 1>&2 2>&3 </dev/tty || true
    else
        echo -e "${CYAN}$text${NC}" >&2
    fi
}

parse_mysql_url() {
    # mysql://user:pass@host:3306/db  (password may be URL-encoded)
    local url="$1"
    [[ "$url" =~ ^mysql:// ]] || die "DATABASE_URL must start with mysql://"
    url="${url#mysql://}"
    local creds_host="${url%%@*}"
    local rest="${url#*@}"
    MYSQL_USER="${creds_host%%:*}"
    local pass_part="${creds_host#*:}"
    if [[ "$pass_part" == "$creds_host" ]]; then
        MYSQL_PASSWORD=""
    else
        MYSQL_PASSWORD="$pass_part"
    fi
    local hostport="${rest%%/*}"
    MYSQL_DATABASE="${rest#*/}"
    MYSQL_DATABASE="${MYSQL_DATABASE%%\?*}"
    if [[ "$hostport" == *:* ]]; then
        MYSQL_HOST="${hostport%%:*}"
        MYSQL_PORT="${hostport##*:}"
    else
        MYSQL_HOST="$hostport"
        MYSQL_PORT="3306"
    fi
}

php_meets_minimum() {
    local v
    v="$(php -r 'echo PHP_VERSION;' 2>/dev/null)" || return 1
    php -r 'exit(version_compare(PHP_VERSION, "8.2.0", "<") ? 1 : 0);' 2>/dev/null
}

node_meets_minimum() {
    local major
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)" || return 1
    [[ "${major:-0}" -ge 20 ]]
}

ensure_ubuntu_universe() {
    local SUDO=""
    [[ "$(id -u)" -ne 0 ]] && SUDO="sudo"
    local os_id=""
    [[ -r /etc/os-release ]] || return 1
    source /etc/os-release
    os_id="${ID:-}"
    [[ "$os_id" == "ubuntu" ]] || return 1
    need_cmd add-apt-repository || {
        log "Installing software-properties-common (for add-apt-repository)…"
        $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq software-properties-common \
            >/dev/null 2>&1 || return 1
    }
    log "Enabling Ubuntu universe repository (required for PHP packages on many images)…"
    $SUDO add-apt-repository -y universe >/dev/null 2>&1 || return 1
    $SUDO apt-get update -qq
}

ensure_debian_packages() {
    [[ "$SKIP_SYSTEM" -eq 1 ]] && return 0
    if [[ "$(id -u)" -ne 0 ]] && ! need_cmd sudo; then
        warn "Not root and sudo missing; install PHP 8.2+, extensions, git, unzip, Node 20+ yourself."
        return 0
    fi
    if ! need_cmd apt-get; then
        return 0
    fi

    local SUDO=""
    [[ "$(id -u)" -ne 0 ]] && SUDO="sudo"

    local -a base_pkgs=(
        ca-certificates curl git unzip mariadb-client software-properties-common whiptail
    )
    local -a php_pkgs=(
        php-cli php-mysql php-xml php-mbstring php-curl php-zip php-bcmath php-intl php-sqlite3
    )

    log "Installing Debian/Ubuntu packages (php-cli, mysql client libs, git, Node via NodeSource if needed)…"
    $SUDO apt-get update -qq || die "apt-get update failed. Check network, DNS, and /etc/apt/sources.list."

    if ! $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        "${base_pkgs[@]}" "${php_pkgs[@]}" >/dev/null 2>&1; then
        warn "Quiet apt install failed; running again with full output (see errors below)…"
        $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y \
            "${base_pkgs[@]}" "${php_pkgs[@]}" || true
    fi

    if ! need_cmd php; then
        if ensure_ubuntu_universe; then
            log "Retrying PHP package install…"
            $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y \
                "${php_pkgs[@]}" || true
        fi
    fi

    if ! need_cmd php; then
        die "PHP CLI is still missing after apt. On Ubuntu try: sudo add-apt-repository universe && sudo apt update && sudo apt install -y php-cli php-mysql php-xml php-mbstring php-curl php-zip php-bcmath php-intl php-sqlite3 — then re-run with --skip-system if packages are already OK."
    fi

    if ! node_meets_minimum 2>/dev/null; then
        log "Installing Node.js 20.x (NodeSource)…"
        local ns_err
        ns_err="$(mktemp)"
        if ! curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash - 2>"$ns_err"; then
            warn "NodeSource setup script failed:"
            cat "$ns_err" >&2 || true
        fi
        rm -f "$ns_err"
        if ! $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null 2>&1; then
            warn "apt install nodejs failed after NodeSource; showing apt output…"
            $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs || \
                warn "Node 20 install failed; install Node 20+ from https://nodejs.org"
        fi
    fi
}

backend_appears_ioncube_encoded() {
    local f="$1/backend/bootstrap/app.php"
    [[ -f "$f" ]] || return 1
    head -c 500 "$f" | grep -q 'get-loader\.ioncube\.com\|ionCube Loader\|//00[0-9a-f]\{2\}cd'
}

ioncube_loader_active() {
    php -r 'exit(extension_loaded("ionCube Loader") ? 0 : 1);' 2>/dev/null
}

ensure_ioncube_loader() {
    local root="$1"
    if [[ "$SKIP_IONCUBE" -eq 1 ]]; then
        return 0
    fi
    if [[ "${INSTALL_IONCUBE:-}" == "1" ]] || [[ "${INSTALL_IONCUBE:-}" == "true" ]]; then
        FORCE_IONCUBE=1
    fi
    if [[ "$FORCE_IONCUBE" -eq 0 ]] && ! backend_appears_ioncube_encoded "$root"; then
        log "Skipping ionCube Loader (backend does not look ionCube-encoded). Use --ioncube or INSTALL_IONCUBE=1 to install anyway."
        return 0
    fi

    if ioncube_loader_active; then
        log "ionCube Loader is already loaded for this PHP."
        return 0
    fi

    local SUDO=""
    [[ "$(id -u)" -ne 0 ]] && SUDO="sudo"

    if [[ "$(id -u)" -ne 0 ]] && ! need_cmd sudo; then
        warn "Cannot install ionCube Loader without root or sudo. Install manually: https://get-loader.ioncube.com"
        return 0
    fi

    need_cmd tar || die "tar is required to unpack ionCube Loaders."

    local php_mm ts_suffix loader_name arch_key url ext_dir full_so conf_d tmpdir
    php_mm="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
    if php -r 'exit(ZEND_THREAD_SAFE ? 0 : 1);' 2>/dev/null; then
        ts_suffix="_ts"
    else
        ts_suffix=""
    fi
    loader_name="ioncube_loader_lin_${php_mm}${ts_suffix}.so"

    case "$(uname -m)" in
        x86_64) arch_key="x86-64" ;;
        aarch64|arm64) arch_key="aarch64" ;;
        *)
            warn "ionCube automatic install: unsupported CPU $(uname -m). Install from https://get-loader.ioncube.com"
            return 0
            ;;
    esac

    url="https://downloads.ioncube.com/loader_downloads/ioncube_loaders_lin_${arch_key}.tar.gz"
    tmpdir="$(mktemp -d)"

    log "Downloading ionCube Loaders (${arch_key}) for PHP ${php_mm}…"
    if ! curl -fsSL "$url" | tar -xzf - -C "$tmpdir"; then
        rm -rf "$tmpdir"
        die "Failed to download or extract ionCube loaders."
    fi

    if [[ ! -f "$tmpdir/ioncube/$loader_name" ]]; then
        rm -rf "$tmpdir"
        die "No loader $loader_name in ionCube package (PHP ${php_mm} may be too new). See https://get-loader.ioncube.com"
    fi

    ext_dir="$(php -r 'echo rtrim(ini_get("extension_dir"), "/");')"
    if [[ -z "$ext_dir" ]]; then
        rm -rf "$tmpdir"
        die "Could not read PHP extension_dir."
    fi

    log "Installing ${loader_name} into ${ext_dir}…"
    $SUDO cp "$tmpdir/ioncube/$loader_name" "$ext_dir/$loader_name"
    rm -rf "$tmpdir"
    full_so="${ext_dir}/${loader_name}"

    conf_d=""
    if php --ini 2>/dev/null | grep -q 'Scan for additional'; then
        conf_d="$(php --ini 2>/dev/null | awk -F': ' '/Scan for additional .ini files in:/ {print $2}' | tr -d ' \r')"
    fi

    if [[ -n "$conf_d" && -d "$conf_d" ]]; then
        log "Enabling zend_extension in ${conf_d}/00-ioncube.ini (CLI)…"
        echo "zend_extension=${full_so}" | $SUDO tee "${conf_d}/00-ioncube.ini" >/dev/null
    fi

    local sapi php_ver
    php_ver="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
    for sapi in fpm apache2 cgi; do
        local d="/etc/php/${php_ver}/${sapi}/conf.d"
        if [[ -d "$d" ]]; then
            log "Enabling ionCube for PHP ${sapi}…"
            echo "zend_extension=${full_so}" | $SUDO tee "${d}/00-ioncube.ini" >/dev/null
        fi
    done

    if ! ioncube_loader_active; then
        warn "ionCube Loader file installed but PHP CLI still does not load it. Check php --ini, php-fpm pool, or restart services."
        return 0
    fi
    log "ionCube Loader is active for PHP $(php -r 'echo PHP_VERSION;')."
}

ensure_composer() {
    if need_cmd composer; then
        return 0
    fi
    local dest="${HOME}/.local/bin"
    mkdir -p "$dest"
    if [[ -x "${dest}/composer" ]]; then
        export PATH="${dest}:${PATH}"
        return 0
    fi
    log "Installing Composer to ${dest}/composer …"
    curl -sS https://getcomposer.org/installer | php -- --install-dir="$dest" --filename=composer
    export PATH="${dest}:${PATH}"
}

ensure_docker_for_mysql() {
    need_cmd docker && docker info >/dev/null 2>&1 && return 0

    if [[ "$SKIP_SYSTEM" -eq 1 ]]; then
        die "Docker is required for --docker-db but was not found. Remove --skip-system to auto-install docker.io on Debian/Ubuntu, install Docker manually (https://docs.docker.com/engine/install/), or use --db-url instead."
    fi
    if ! need_cmd apt-get; then
        die "Docker is required for --docker-db but was not found, and apt-get is unavailable. Install Docker or use --db-url."
    fi
    if [[ "$(id -u)" -ne 0 ]] && ! need_cmd sudo; then
        die "Docker is required for --docker-db. Install Docker as root/sudo, or use --db-url."
    fi

    local SUDO=""
    [[ "$(id -u)" -ne 0 ]] && SUDO="sudo"

    if need_cmd docker && ! docker info >/dev/null 2>&1; then
        log "Docker CLI found but daemon is not running; starting docker…"
        if need_cmd systemctl; then
            $SUDO systemctl enable --now docker 2>/dev/null || $SUDO systemctl start docker 2>/dev/null || true
        else
            $SUDO service docker start 2>/dev/null || true
        fi
        docker info >/dev/null 2>&1 && return 0
        die "Docker daemon is not running. Try: sudo systemctl start docker"
    fi

    need_cmd docker && return 0

    log "Docker not found; installing docker.io (Debian/Ubuntu via apt)…"
    $SUDO apt-get update -qq || true
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io \
        || die "Failed to install docker.io. Install Docker manually: https://docs.docker.com/engine/install/"

    if need_cmd systemctl; then
        $SUDO systemctl enable --now docker 2>/dev/null || $SUDO systemctl start docker 2>/dev/null || true
    else
        $SUDO service docker start 2>/dev/null || true
    fi

    need_cmd docker || die "docker.io installed but docker CLI not found. Open a new shell or run hash -r."
    docker info >/dev/null 2>&1 || die "Docker is installed but the daemon is not running. Try: sudo systemctl start docker"
}

load_docker_mysql_pass_from_prev_install() {
    local root="$1"
    local f line val
    for f in "${root}/.install-docker-mysql" "${root}/backend/.env"; do
        [[ -r "$f" ]] || continue
        line="$(grep -E '^DB_PASSWORD=' "$f" 2>/dev/null | tail -n1)" || true
        [[ -n "$line" ]] || continue
        val="${line#DB_PASSWORD=}"
        val="${val#\"}"
        val="${val%\"}"
        val="${val#\'}"
        val="${val%\'}"
        [[ -n "$val" ]] || continue
        printf '%s' "$val"
        return 0
    done
    return 1
}

maybe_generate_docker_mysql_password() {
    local root="$1"
    [[ "$USE_DOCKER_DB" -eq 1 ]] || return 0

    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$DOCKER_MYSQL_CONTAINER"; then
        if [[ -n "$DOCKER_DB_PASS" ]]; then
            return 0
        fi
        if DOCKER_DB_PASS="$(load_docker_mysql_pass_from_prev_install "$root")"; then
            log "Using MariaDB password from existing install files for container ${DOCKER_MYSQL_CONTAINER}."
            return 0
        fi
        die "Docker container ${DOCKER_MYSQL_CONTAINER} already exists but DOCKER_DB_PASS is unset. Export the password you used at create time, or remove the container (docker rm -f ${DOCKER_MYSQL_CONTAINER}) and re-run."
    fi

    if [[ -n "$DOCKER_DB_PASS" ]]; then
        return 0
    fi
    need_cmd openssl || die "openssl is required to generate a random MariaDB password."
    DOCKER_DB_PASS="$(openssl rand -hex 24)"
    log "Generated random MariaDB password for new Docker container (${DOCKER_MYSQL_CONTAINER})."
}

start_docker_mysql() {
    ensure_docker_for_mysql
    if docker ps -a --format '{{.Names}}' | grep -qx "$DOCKER_MYSQL_CONTAINER"; then
        log "Starting existing container ${DOCKER_MYSQL_CONTAINER}…"
        docker start "$DOCKER_MYSQL_CONTAINER" >/dev/null
    else
        log "Creating MariaDB container ${DOCKER_MYSQL_CONTAINER} on port ${DOCKER_MYSQL_PORT}…"
        docker run -d \
            --name "$DOCKER_MYSQL_CONTAINER" \
            -p "${DOCKER_MYSQL_PORT}:3306" \
            -e "MARIADB_ROOT_PASSWORD=${DOCKER_DB_PASS}_root" \
            -e "MARIADB_DATABASE=${DOCKER_DB_NAME}" \
            -e "MARIADB_USER=${DOCKER_DB_USER}" \
            -e "MARIADB_PASSWORD=${DOCKER_DB_PASS}" \
            "$DOCKER_MYSQL_IMAGE" >/dev/null
    fi

    log "Waiting for MySQL to accept connections…"
    local i
    for i in $(seq 1 60); do
        if docker exec "$DOCKER_MYSQL_CONTAINER" mariadb-admin ping -h 127.0.0.1 -u root -p"${DOCKER_DB_PASS}_root" --silent 2>/dev/null; then
            return 0
        fi
        sleep 2
    done
    die "MySQL in Docker did not become ready in time."
}

apply_backend_db_env() {
    local backend_env="$1"
    local host="$2"
    local port="$3"
    local database="$4"
    local user="$5"
    local password="$6"

    if [[ ! -f "$backend_env" ]]; then
        die "Missing ${backend_env}"
    fi

    php -r '
        $path = $argv[1];
        $pairs = [
            "DB_CONNECTION" => "mysql",
            "DB_HOST" => $argv[2],
            "DB_PORT" => $argv[3],
            "DB_DATABASE" => $argv[4],
            "DB_USERNAME" => $argv[5],
            "DB_PASSWORD" => $argv[6],
        ];
        $lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
        $out = [];
        $seen = array_fill_keys(array_keys($pairs), false);
        foreach ($lines as $line) {
            $replaced = false;
            foreach ($pairs as $k => $v) {
                if (str_starts_with($line, $k . "=")) {
                    $out[] = $k . "=" . $v;
                    $seen[$k] = true;
                    $replaced = true;
                    break;
                }
            }
            if (!$replaced) {
                $out[] = $line;
            }
        }
        foreach ($pairs as $k => $v) {
            if (!$seen[$k]) {
                $out[] = $k . "=" . $v;
            }
        }
        file_put_contents($path, implode("\n", $out) . "\n");
    ' "$backend_env" "$host" "$port" "$database" "$user" "$password"
}

primary_ipv4() {
    local ip=""
    if need_cmd hostname; then
        ip="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -Ev '^127\.|^169\.254\.|^$' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1)"
    fi
    if [[ -z "$ip" ]] && need_cmd ip; then
        ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit }}')"
    fi
    if [[ -z "$ip" ]]; then
        ip="127.0.0.1"
        warn "Could not detect a non-loopback IPv4; using 127.0.0.1 in URLs (set manually in .env if wrong)."
    fi
    printf '%s' "$ip"
}

normalize_install_url() {
    local raw="$1"
    local role="$2"
    local port_def=8000
    [[ "$role" == frontend ]] && port_def=3000
    raw="${raw#"${raw%%[![:space:]]*}"}"
    raw="${raw%"${raw##*[![:space:]]}"}"
    [[ -n "$raw" ]] || return 1
    if [[ "$raw" =~ ^https?:// ]]; then
        printf '%s' "${raw%/}"
        return 0
    fi
    if [[ "$raw" =~ ^[^:]+:[0-9]+$ ]]; then
        printf '%s' "http://${raw}"
        return 0
    fi
    if [[ "$raw" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        printf '%s' "http://${raw}:${port_def}"
        return 0
    fi
    if [[ "$raw" != *"/"* && "$raw" != *:* ]]; then
        printf '%s' "http://${raw}:${port_def}"
        return 0
    fi
    printf '%s' "$raw"
    return 0
}

domain_for_next_public() {
    php -r '
        $u = parse_url($argv[1]);
        if (!$u || empty($u["host"])) {
            fwrite(STDERR, "error: invalid URL\n");
            exit(1);
        }
        $host = $u["host"];
        $scheme = strtolower($u["scheme"] ?? "http");
        $port = $u["port"] ?? null;
        if ($port === null) {
            $port = ($scheme === "https") ? 443 : 80;
        }
        $def = ($scheme === "https") ? 443 : 80;
        echo ((int) $port === (int) $def) ? $host : ($host . ":" . $port);
    ' "$1"
}

install_should_prompt_urls() {
    [[ -n "${CI:-}" ]] && return 1
    [[ -t 0 ]] || return 1
    [[ -n "${FRONTEND_URL_ARG:-}" ]] && return 1
    [[ -n "${INSTALL_FRONTEND_URL:-}" ]] && return 1
    return 0
}

prompt_public_urls() {
    local host_ip="$1"
    local def_fe="http://${host_ip}:3000"
    local in_fe
    ui_step "Public site URL"
    in_fe="$(ui_inputbox "Frontend URL — what users open in the browser (NEXTAUTH_URL / site).\\nLaravel API is fixed at ${INTERNAL_LARAVEL_URL} on this server (not prompted).\\n\\nFull URL, host:port, or bare IP (default port 3000).\\n\\nDefault:" 16 72 "$def_fe")" || true
    in_fe="${in_fe:-$def_fe}"
    PUBLIC_FRONTEND_URL="$(normalize_install_url "$in_fe" frontend)" || die "Invalid frontend URL: ${in_fe}"
}

resolve_public_urls() {
    local host_ip="$1"
    PUBLIC_FRONTEND_URL=""
    local raw_fe

    if [[ -n "${BACKEND_URL_ARG:-}" || -n "${INSTALL_BACKEND_URL:-}" ]]; then
        warn "Ignoring --backend-url / INSTALL_BACKEND_URL; Laravel uses ${INTERNAL_LARAVEL_URL} (local to this server)."
    fi

    if [[ -n "${FRONTEND_URL_ARG:-}" || -n "${INSTALL_FRONTEND_URL:-}" ]]; then
        raw_fe="${FRONTEND_URL_ARG:-${INSTALL_FRONTEND_URL:-}}"
        PUBLIC_FRONTEND_URL="$(normalize_install_url "$raw_fe" frontend)" || die "Invalid --frontend-url / INSTALL_FRONTEND_URL: ${raw_fe}"
    fi

    if install_should_prompt_urls; then
        prompt_public_urls "$host_ip"
    else
        [[ -n "$PUBLIC_FRONTEND_URL" ]] || PUBLIC_FRONTEND_URL="$(normalize_install_url "http://${host_ip}:3000" frontend)"
    fi

    [[ -n "$PUBLIC_FRONTEND_URL" ]] || die "Could not resolve public frontend URL."
}

apply_backend_public_env() {
    local backend_env="$1"
    local app_url="$2"
    local fe_url="$3"
    [[ -f "$backend_env" ]] || die "Missing ${backend_env}"
    php -r '
        $path = $argv[1];
        $pairs = [
            "APP_URL" => $argv[2],
            "FRONTEND_URL" => $argv[3],
            "STORAGE_PUBLIC_URL" => $argv[3],
            "APP_ENV" => "production",
            "APP_DEBUG" => "false",
        ];
        $lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
        $out = [];
        $seen = array_fill_keys(array_keys($pairs), false);
        foreach ($lines as $line) {
            $replaced = false;
            foreach ($pairs as $k => $v) {
                if (str_starts_with($line, $k . "=")) {
                    $out[] = $k . "=" . $v;
                    $seen[$k] = true;
                    $replaced = true;
                    break;
                }
            }
            if (!$replaced) {
                $out[] = $line;
            }
        }
        foreach ($pairs as $k => $v) {
            if (!$seen[$k]) {
                $out[] = $k . "=" . $v;
            }
        }
        file_put_contents($path, implode("\n", $out) . "\n");
    ' "$backend_env" "$app_url" "$fe_url"
}

apply_frontend_public_env() {
    local fe_env="$1"
    local backend_url="$2"
    local site_url="$3"
    local public_domain
    public_domain="$(domain_for_next_public "$site_url")" || die "Invalid frontend URL for NEXT_PUBLIC_DOMAIN: ${site_url}"
    [[ -f "$fe_env" ]] || die "Missing ${fe_env}"
    php -r '
        $path = $argv[1];
        $backend = $argv[2];
        $nextauth = $argv[3];
        $domain = $argv[4];
        $domainQuoted = "\"" . str_replace(["\\", "\""], ["\\\\", "\\\""], $domain) . "\"";
        $lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
        $out = [];
        $seen = ["BACKEND_URL" => false, "NEXTAUTH_URL" => false, "NEXT_PUBLIC_DOMAIN" => false];
        foreach ($lines as $line) {
            $replaced = false;
            foreach (array_keys($seen) as $k) {
                if (str_starts_with($line, $k . "=")) {
                    if ($k === "BACKEND_URL") {
                        $out[] = $k . "=" . $backend;
                    } elseif ($k === "NEXTAUTH_URL") {
                        $out[] = $k . "=" . $nextauth;
                    } else {
                        $out[] = $k . "=" . $domainQuoted;
                    }
                    $seen[$k] = true;
                    $replaced = true;
                    break;
                }
            }
            if (!$replaced) {
                $out[] = $line;
            }
        }
        if (!$seen["BACKEND_URL"]) {
            $out[] = "BACKEND_URL=" . $backend;
        }
        if (!$seen["NEXTAUTH_URL"]) {
            $out[] = "NEXTAUTH_URL=" . $nextauth;
        }
        if (!$seen["NEXT_PUBLIC_DOMAIN"]) {
            $out[] = "NEXT_PUBLIC_DOMAIN=" . $domainQuoted;
        }
        file_put_contents($path, implode("\n", $out) . "\n");
    ' "$fe_env" "$backend_url" "$site_url" "$public_domain"
}

sync_backend_nextauth_from_frontend() {
    local backend_env="$1"
    local fe_env="$2"
    [[ -f "$backend_env" && -f "$fe_env" ]] || return 0
    php -r '
        $be = $argv[1];
        $fe = $argv[2];
        $secret = "";
        foreach (file($fe, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
            if (str_starts_with($line, "NEXTAUTH_SECRET=")) {
                $secret = trim(substr($line, strlen("NEXTAUTH_SECRET=")), " \t\"");
                break;
            }
        }
        if ($secret === "") {
            exit(0);
        }
        $bl = file($be, FILE_IGNORE_NEW_LINES) ?: [];
        $out = [];
        $seen = false;
        foreach ($bl as $line) {
            if (str_starts_with($line, "NEXTAUTH_SECRET=")) {
                $out[] = "NEXTAUTH_SECRET=" . $secret;
                $seen = true;
            } else {
                $out[] = $line;
            }
        }
        if (!$seen) {
            $out[] = "NEXTAUTH_SECRET=" . $secret;
        }
        file_put_contents($be, implode("\n", $out) . "\n");
    ' "$backend_env" "$fe_env"
}

apply_backend_paynow_steam_env() {
    local path="$1"
    local paynow="${2:-}"
    local steam="${3:-}"
    [[ -f "$path" ]] || die "Missing ${path}"
    [[ -n "$paynow" || -n "$steam" ]] || return 0
    php -r '
        $path = $argv[1];
        $paynow = $argv[2];
        $steam = $argv[3];
        $q = function (string $s): string {
            return "\"" . str_replace(["\\", "\""], ["\\\\", "\\\""], $s) . "\"";
        };
        $pairs = [];
        if ($paynow !== "") {
            $pairs["PAYNOW_KEY"] = $q($paynow);
            $pairs["NEXT_PUBLIC_PAYNOW_KEY"] = $q($paynow);
        }
        if ($steam !== "") {
            $pairs["STEAM_SECRET"] = $q($steam);
        }
        if ($pairs === []) {
            return;
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
        $out = [];
        $seen = array_fill_keys(array_keys($pairs), false);
        foreach ($lines as $line) {
            $replaced = false;
            foreach ($pairs as $k => $v) {
                if (str_starts_with($line, $k . "=")) {
                    $out[] = $k . "=" . $v;
                    $seen[$k] = true;
                    $replaced = true;
                    break;
                }
            }
            if (!$replaced) {
                $out[] = $line;
            }
        }
        foreach ($pairs as $k => $v) {
            if (!$seen[$k]) {
                $out[] = $k . "=" . $v;
            }
        }
        file_put_contents($path, implode("\n", $out) . "\n");
    ' "$path" "$paynow" "$steam"
}

apply_frontend_paynow_steam_env() {
    local path="$1"
    local paynow="${2:-}"
    local steam="${3:-}"
    [[ -f "$path" ]] || die "Missing ${path}"
    [[ -n "$paynow" || -n "$steam" ]] || return 0
    php -r '
        $path = $argv[1];
        $paynow = $argv[2];
        $steam = $argv[3];
        $q = function (string $s): string {
            return "\"" . str_replace(["\\", "\""], ["\\\\", "\\\""], $s) . "\"";
        };
        $pairs = [];
        if ($paynow !== "") {
            $pairs["PAYNOW_KEY"] = $q($paynow);
            $pairs["NEXT_PUBLIC_PAYNOW_KEY"] = $q($paynow);
        }
        if ($steam !== "") {
            $pairs["STEAM_SECRET"] = $q($steam);
        }
        if ($pairs === []) {
            return;
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
        $out = [];
        $seen = array_fill_keys(array_keys($pairs), false);
        foreach ($lines as $line) {
            $replaced = false;
            foreach ($pairs as $k => $v) {
                if (str_starts_with($line, $k . "=")) {
                    $out[] = $k . "=" . $v;
                    $seen[$k] = true;
                    $replaced = true;
                    break;
                }
            }
            if (!$replaced) {
                $out[] = $line;
            }
        }
        foreach ($pairs as $k => $v) {
            if (!$seen[$k]) {
                $out[] = $k . "=" . $v;
            }
        }
        file_put_contents($path, implode("\n", $out) . "\n");
    ' "$path" "$paynow" "$steam"
}

resolve_paynow_steam() {
    PAYNOW_KEY_VAL="${PAYNOW_KEY_ARG:-${INSTALL_PAYNOW_KEY:-}}"
    STEAM_SECRET_VAL="${STEAM_SECRET_ARG:-${INSTALL_STEAM_SECRET:-}}"
}

ensure_laravel_backend_layout() {
    local backend="$1"
    mkdir -p \
        "${backend}/bootstrap/cache" \
        "${backend}/storage/app/public" \
        "${backend}/storage/framework/cache/data" \
        "${backend}/storage/framework/sessions" \
        "${backend}/storage/framework/testing" \
        "${backend}/storage/framework/views" \
        "${backend}/storage/logs"
}

setup_backend() {
    local root="$1"
    local backend="${root}/backend"
    [[ -f "${backend}/composer.json" ]] || die "No backend/composer.json under ${root}"

    if [[ ! -f "${backend}/.env" ]]; then
        cp "${backend}/.env.example" "${backend}/.env"
        log "Created backend/.env from .env.example"
    fi

    ensure_laravel_backend_layout "$backend"

    log "Composer install (backend)…"
    (cd "$backend" && composer install --no-interaction --prefer-dist)

    php "${backend}/artisan" key:generate --force

    log "Running migrations…"
    php "${backend}/artisan" migrate --force

    log "Seeding default data (roles, settings, navigation, …)…"
    php "${backend}/artisan" db:seed --force

    log "Storage link…"
    php "${backend}/artisan" storage:link 2>/dev/null || true
}

setup_frontend() {
    local root="$1"
    local backend_url="$2"
    local frontend_url="$3"
    local fe="${root}/frontend"
    [[ -f "${fe}/package.json" ]] || die "No frontend/package.json under ${root}"

    log "npm install (frontend)…"
    (cd "$fe" && npm install)

    if [[ ! -f "${fe}/.env" ]]; then
        cp "${fe}/.env.example" "${fe}/.env"
        log "Created frontend/.env from .env.example"
    fi

    local secret
    secret="$(openssl rand -hex 32 2>/dev/null || php -r 'echo bin2hex(random_bytes(16));')"
    if grep -qE '^NEXTAUTH_SECRET=("")?$' "${fe}/.env" 2>/dev/null; then
        tmp="${fe}/.env.install.tmp.$$"
        awk -v s="$secret" '
            /^NEXTAUTH_SECRET=/ { print "NEXTAUTH_SECRET=\"" s "\""; next }
            { print }
        ' "${fe}/.env" > "$tmp" && mv "$tmp" "${fe}/.env"
        log "Set NEXTAUTH_SECRET in frontend/.env"
    fi

    log "Writing frontend .env (BACKEND_URL, NEXTAUTH_URL, NEXT_PUBLIC_DOMAIN)…"
    apply_frontend_public_env "${fe}/.env" "$backend_url" "$frontend_url"
    if [[ -n "${PAYNOW_KEY_VAL:-}" || -n "${STEAM_SECRET_VAL:-}" ]]; then
        log "Writing optional PayNow / Steam keys to frontend/.env (skipped if unset — use /setup wizard)…"
        apply_frontend_paynow_steam_env "${fe}/.env" "$PAYNOW_KEY_VAL" "$STEAM_SECRET_VAL"
    else
        log "Skipping PayNow / Steam in .env (configure in /setup wizard)."
    fi
    sync_backend_nextauth_from_frontend "${root}/backend/.env" "${fe}/.env"
    log "Synced NEXTAUTH_SECRET to backend/.env for API proxy auth."

    if [[ "$SKIP_FRONTEND_BUILD" -eq 0 ]]; then
        log "npm run build (frontend)…"
        (cd "$fe" && TEMPLATE_UPDATE_SKIP_TYPECHECK=1 npm run build)
    else
        warn "Skipped frontend build (--no-frontend-build)."
    fi
}

install_laravel_scheduler_cron() {
    local root="$1"
    local script="${root}/scripts/ensure-laravel-scheduler.sh"
    if [[ -f "$script" ]]; then
        bash "$script" "$root" || warn "Could not configure the Laravel scheduler."
    else
        warn "Missing ${script}; skipping Laravel scheduler cron."
    fi
}

start_backend_production() {
    local root="$1"
    local backend="${root}/backend"
    local logf="${backend}/storage/logs/install-artisan-serve.log"
    ensure_laravel_backend_layout "$backend"
    mkdir -p "$(dirname "$logf")"
    log "Starting Laravel (php artisan serve, production .env) on 0.0.0.0:8000…"
    (
        cd "$backend" || exit 1
        PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-4}" nohup php artisan serve --no-reload --host=0.0.0.0 --port=8000 >>"$logf" 2>&1 &
        echo $! >"${root}/.rust-template-backend-serve.pid"
    )
    sleep 2
    if curl -sf -o /dev/null --connect-timeout 2 "http://127.0.0.1:8000/up" 2>/dev/null \
        || curl -sf -o /dev/null --connect-timeout 2 "http://127.0.0.1:8000/" 2>/dev/null; then
        log "Backend responding on port 8000 (log: ${logf})"
    else
        warn "Backend may not be listening on 8000 (port in use or still starting). Check: ${logf}"
    fi
}

start_frontend_production() {
    local root="$1"
    local fe="${root}/frontend"
    local logf="${fe}/install-next-start.log"
    [[ "$SKIP_FRONTEND_BUILD" -eq 0 ]] || {
        warn "Frontend build was skipped; not starting Next.js."
        return 0
    }
    log "Starting Next.js (next start) on 0.0.0.0:3000…"
    (
        cd "$fe" || exit 1
        nohup npm run start -- --hostname 0.0.0.0 --port 3000 >>"$logf" 2>&1 &
        echo $! >"${root}/.rust-template-frontend-serve.pid"
    )
    sleep 3
    if curl -sf -o /dev/null --connect-timeout 3 "http://127.0.0.1:3000/" 2>/dev/null; then
        log "Frontend responding on port 3000 (log: ${logf})"
    else
        warn "Frontend may not be listening on 3000 (port in use or still starting). Check: ${logf}"
    fi
}

public_url_host() {
    php -r '$u = parse_url($argv[1]); echo $u["host"] ?? "";' "$1"
}

nginx_skip_for_host() {
    local raw="$1"
    local h="${raw,,}"
    [[ -z "$raw" ]] && return 0
    [[ "$h" == "localhost" || "$h" == "127.0.0.1" ]] && return 0
    [[ "$raw" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && return 0
    [[ "$raw" == \[* ]] && return 0
    return 1
}

cloudflare_proxy_dns_likely() {
    local host="$1"
    need_cmd php || return 3
    local tmp
    tmp="$(mktemp)"
    cat >"$tmp" <<'PHP'
<?php
declare(strict_types=1);
$host = $argv[1] ?? '';
if ($host === '') {
    exit(3);
}

function fetch_net_lines(string $url): ?array
{
    $ctx = stream_context_create([
        'http' => ['timeout' => 25],
        'https' => ['timeout' => 25],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false && function_exists('shell_exec')) {
        $esc = escapeshellarg($url);
        $body = shell_exec("curl -fsSL --connect-timeout 25 {$esc} 2>/dev/null");
    }
    if ($body === false || $body === null || $body === '') {
        return null;
    }
    $out = [];
    foreach (explode("\n", (string) $body) as $line) {
        $t = trim($line);
        if ($t !== '') {
            $out[] = $t;
        }
    }
    return $out === [] ? null : $out;
}

function ip_in_cidr(string $ip, string $cidr): bool
{
    $parts = explode('/', $cidr, 2);
    $net = $parts[0];
    $maxBits = str_contains($ip, ':') ? 128 : 32;
    $bits = isset($parts[1]) ? (int) $parts[1] : $maxBits;
    if ($bits < 0 || $bits > $maxBits) {
        return false;
    }
    $bIp = @inet_pton($ip);
    $bNet = @inet_pton($net);
    if ($bIp === false || $bNet === false) {
        return false;
    }
    $len = strlen($bIp);
    if ($len !== strlen($bNet)) {
        return false;
    }
    $fullBytes = intdiv($bits, 8);
    $rem = $bits % 8;
    for ($i = 0; $i < $fullBytes; $i++) {
        if ($bIp[$i] !== $bNet[$i]) {
            return false;
        }
    }
    if ($rem === 0) {
        return true;
    }
    $mask = (0xFF << (8 - $rem)) & 0xFF;

    return (ord($bIp[$fullBytes]) & $mask) === (ord($bNet[$fullBytes]) & $mask);
}

$nets = [];
foreach (['https://www.cloudflare.com/ips-v4/', 'https://www.cloudflare.com/ips-v6/'] as $url) {
    $lines = fetch_net_lines($url);
    if ($lines === null) {
        exit(3);
    }
    foreach ($lines as $line) {
        $nets[] = $line;
    }
}

$recs = @dns_get_record($host, DNS_A | DNS_AAAA);
if ($recs === false) {
    exit(2);
}
$ips = [];
foreach ($recs as $r) {
    if (! empty($r['ip'])) {
        $ips[] = $r['ip'];
    }
    if (! empty($r['ipv6'])) {
        $ips[] = $r['ipv6'];
    }
}
if ($ips === []) {
    exit(2);
}
foreach ($ips as $ip) {
    foreach ($nets as $cidr) {
        if (ip_in_cidr($ip, $cidr)) {
            exit(0);
        }
    }
}
exit(1);
PHP
    php "$tmp" "$host" 2>/dev/null
    local code=$?
    rm -f "$tmp"
    return "$code"
}

write_nginx_cloudflare_realip_snippet() {
    local SUDO="$1"
    local dest="/etc/nginx/snippets/rust-template-cloudflare-real-ip.conf"
    local tmp v4 v6
    tmp="$(mktemp)"
    v4="$(mktemp)"
    v6="$(mktemp)"
    if curl -fsSL "https://www.cloudflare.com/ips-v4/" -o "$v4" && curl -fsSL "https://www.cloudflare.com/ips-v6/" -o "$v6"; then
        {
            echo "# Cloudflare published ranges — CF-Connecting-IP (generated $(date -u +%Y-%m-%dT%H:%M:%SZ))"
            while IFS= read -r line || [[ -n "$line" ]]; do
                line="${line//$'\r'/}"
                [[ -n "$line" ]] && echo "set_real_ip_from ${line};"
            done <"$v4"
            while IFS= read -r line || [[ -n "$line" ]]; do
                line="${line//$'\r'/}"
                [[ -n "$line" ]] && echo "set_real_ip_from ${line};"
            done <"$v6"
            echo "real_ip_header CF-Connecting-IP;"
            echo "real_ip_recursive on;"
        } >"$tmp"
    else
        warn "Could not download Cloudflare IP lists; leaving a placeholder snippet (add ranges later)."
        echo "# Cloudflare IP lists download failed — re-run or paste https://www.cloudflare.com/ips-v4/ and https://www.cloudflare.com/ips-v6/" >"$tmp"
    fi
    rm -f "$v4" "$v6"
    $SUDO mkdir -p /etc/nginx/snippets
    $SUDO cp "$tmp" "$dest"
    rm -f "$tmp"
    $SUDO chmod 644 "$dest"
}

write_nginx_forwarded_proto_map() {
    local SUDO="$1"
    local tmp
    tmp="$(mktemp)"
    cat >"$tmp" <<'MAP'
# Prefer client proto from Cloudflare / upstream proxies when present (Flexible SSL → origin HTTP).
map $http_x_forwarded_proto $rust_template_forwarded_proto {
    ""      $scheme;
    default $http_x_forwarded_proto;
}
MAP
    $SUDO mkdir -p /etc/nginx/conf.d
    $SUDO cp "$tmp" /etc/nginx/conf.d/99-rust-template-forwarded-proto.conf
    rm -f "$tmp"
    $SUDO chmod 644 /etc/nginx/conf.d/99-rust-template-forwarded-proto.conf
}

write_nginx_site_rust_template() {
    local SUDO="$1"
    local server_names="$2"
    local tmp
    tmp="$(mktemp)"
    cat >"$tmp" <<NGX
# Rust Template — reverse proxy to Next.js (install.sh)
server {
    listen 80;
    listen [::]:80;
    server_name ${server_names};

    client_max_body_size 32m;

    include /etc/nginx/snippets/rust-template-cloudflare-real-ip.conf;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$rust_template_forwarded_proto;
        proxy_read_timeout 86400;
    }
}
NGX
    $SUDO cp "$tmp" /etc/nginx/sites-available/rust-template
    rm -f "$tmp"
    $SUDO chmod 644 /etc/nginx/sites-available/rust-template
    $SUDO ln -sf /etc/nginx/sites-available/rust-template /etc/nginx/sites-enabled/rust-template
}

port_80_listen_lines() {
    command -v ss >/dev/null 2>&1 || return 0
    ss -tlnpH 2>/dev/null | awk '$4 ~ /:80$/ {print}' || true
}

port_80_available_for_nginx() {
    local lines bad
    lines="$(port_80_listen_lines)"
    [[ -z "$lines" ]] && return 0
    bad="$(echo "$lines" | grep -v nginx || true)"
    if [[ -n "$bad" ]]; then
        warn "Port 80 is in use by a non-nginx process. Stop it (e.g. systemctl stop apache2, or a container publishing :80) so nginx can bind and certbot can reload nginx."
        while IFS= read -r l; do
            [[ -n "$l" ]] && warn "  $l"
        done <<<"$lines"
        return 1
    fi
    return 0
}

nginx_reload_or_restart() {
    local SUDO="$1"
    if $SUDO systemctl reload nginx 2>/dev/null; then
        return 0
    fi
    if $SUDO service nginx reload 2>/dev/null; then
        return 0
    fi
    if $SUDO systemctl restart nginx 2>/dev/null; then
        return 0
    fi
    return 1
}

resolve_certbot_email() {
    local fe_host="$1"
    local out="${CERTBOT_EMAIL_ARG:-${INSTALL_CERTBOT_EMAIL:-}}"
    if [[ -n "$out" ]]; then
        printf '%s' "$out"
        return 0
    fi
    if [[ -n "${CI:-}" ]]; then
        return 1
    fi
    if [[ -t 0 ]] && [[ -r /dev/tty ]]; then
        out="$(ui_inputbox "Let’s Encrypt needs an email (renewal notices, account recovery).\\n\\nEmail:" 10 64 "admin@${fe_host}")" </dev/tty || true
        [[ -n "${out// }" ]] || return 1
        printf '%s' "$out"
        return 0
    fi
    return 1
}

maybe_setup_nginx_domain_proxy() {
    local root="$1"
    local fe_url="$2"
    [[ "$SKIP_NGINX" -eq 0 ]] || return 0
    [[ "$SKIP_SYSTEM" -eq 0 ]] || {
        warn "Skipping nginx setup (--skip-system): install nginx/certbot yourself or re-run without --skip-system."
        return 0
    }
    need_cmd apt-get || return 0

    local SUDO=""
    [[ "$(id -u)" -ne 0 ]] && SUDO="sudo"
    if [[ "$(id -u)" -ne 0 ]] && ! need_cmd sudo; then
        warn "Need root or sudo to configure nginx; skipping."
        return 0
    fi

    local fe_host
    fe_host="$(public_url_host "$fe_url")"
    [[ -n "$fe_host" ]] || return 0
    if nginx_skip_for_host "$fe_host"; then
        log "Skipping nginx (host is localhost, bare IP, or IPv6 literal — use a domain name for automatic nginx)."
        return 0
    fi

    ui_step "Nginx reverse proxy (domain)"
    local cf_det=0
    cloudflare_proxy_dns_likely "$fe_host" 2>/dev/null || cf_det=$?
    case "$cf_det" in
        0) log "DNS suggests Cloudflare proxy: A/AAAA record(s) resolve to Cloudflare anycast ranges." ;;
        1) log "DNS: hostname does not resolve to Cloudflare edge IPs (direct or other CDN). Cloudflare real_ip snippet is still installed; it only applies when the connecting client is a Cloudflare edge IP." ;;
        2) warn "Could not resolve ${fe_host} — check DNS. Continuing with nginx + Cloudflare IP snippet." ;;
        3) log "Cloudflare proxy DNS check skipped (could not download IP lists or PHP unavailable). Nginx still installs the Cloudflare real-IP snippet via curl when possible." ;;
        *) warn "Unexpected Cloudflare check exit ${cf_det}; continuing with nginx." ;;
    esac
    if [[ "${INSTALL_CLOUDFLARE_PROXY:-}" =~ ^(1|true|yes)$ ]]; then
        log "INSTALL_CLOUDFLARE_PROXY set: using Cloudflare edge IP lists for real_ip (see snippet on disk)."
    fi

    log "Installing nginx, certbot, python3-certbot-nginx…"
    if ! $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx certbot python3-certbot-nginx python3 >/dev/null 2>&1; then
        $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx python3 \
            || {
                warn "apt install nginx/certbot failed; skipping nginx setup."
                return 0
            }
    fi

    write_nginx_cloudflare_realip_snippet "$SUDO"
    write_nginx_forwarded_proto_map "$SUDO"
    write_nginx_site_rust_template "$SUDO" "$fe_host"

    local nginx_ok=0
    if $SUDO nginx -t 2>/dev/null; then
        $SUDO systemctl enable nginx >/dev/null 2>&1 || true
        port_80_available_for_nginx || true
        if nginx_reload_or_restart "$SUDO"; then
            nginx_ok=1
            log "nginx configured for ${fe_host} → http://127.0.0.1:3000 (Cloudflare real_ip snippet included)."
        else
            warn "nginx did not reload/restart — port 80 is probably already taken (certbot will fail the same way). Inspect: sudo ss -tlnp | awk '\$4 ~ /:80\$/'"
            while IFS= read -r l; do
                [[ -n "$l" ]] && warn "  $l"
            done <<<"$(port_80_listen_lines)"
            warn "Site config is on disk at /etc/nginx/sites-available/rust-template; free port 80, then: sudo systemctl restart nginx"
        fi
    else
        warn "nginx -t failed after writing site config; fix /etc/nginx and reload nginx manually."
        return 0
    fi

    local site_token
    site_token="$(openssl rand -hex 32 2>/dev/null || php -r 'echo bin2hex(random_bytes(16));')"
    printf '%s\n' "$site_token" >"${root}/.install-domain-token"
    chmod 600 "${root}/.install-domain-token" 2>/dev/null || true
    log "Wrote domain setup token to ${root}/.install-domain-token (optional verification / automation secret)."

    [[ "$INSTALL_SKIP_SSL" -eq 0 ]] || {
        log "SSL skipped (--skip-ssl or INSTALL_SKIP_SSL)."
        return 0
    }

    local cert_email
    cert_email="$(resolve_certbot_email "$fe_host")" || {
        warn "No certbot email (set INSTALL_CERTBOT_EMAIL or --certbot-email). Skipping Let’s Encrypt."
        return 0
    }

    [[ "$nginx_ok" -eq 1 ]] || {
        warn "Skipping Let’s Encrypt until nginx is listening on port 80. Free the port, then: sudo systemctl restart nginx && sudo certbot --nginx -d ${fe_host}"
        return 0
    }

    log "Requesting Let’s Encrypt certificate (certbot --nginx)…"
    if $SUDO certbot --nginx -d "$fe_host" --non-interactive --agree-tos --email "$cert_email" --redirect; then
        local fe_https="https://${fe_host}"
        INSTALL_PUBLIC_FRONTEND_URL_RESULT="$fe_https"
        log "TLS enabled. Updating .env public URLs to ${fe_https} …"
        apply_backend_public_env "${root}/backend/.env" "$INTERNAL_LARAVEL_URL" "$fe_https"
        apply_frontend_public_env "${root}/frontend/.env" "$INTERNAL_LARAVEL_URL" "$fe_https"
        if [[ "$SKIP_FRONTEND_BUILD" -eq 0 ]]; then
            log "Rebuilding frontend (NEXT_PUBLIC_* must match new URL)…"
            (cd "${root}/frontend" && TEMPLATE_UPDATE_SKIP_TYPECHECK=1 npm run build) || warn "npm run build failed after HTTPS switch; run it manually in frontend/."
        else
            warn "Frontend was built before HTTPS. Run: cd ${root}/frontend && npm run build"
        fi
        if [[ "$SKIP_START_SERVERS" -eq 0 ]] && [[ -f "${root}/.rust-template-frontend-serve.pid" ]]; then
            warn "Restart Next.js to pick up .env changes: kill \$(cat ${root}/.rust-template-frontend-serve.pid) and start again, or reboot your process manager."
        fi
    else
        warn "certbot failed. Common causes: DNS not pointing here, firewall blocking :80, or port 80 in use so nginx cannot restart. Check: sudo ss -tlnp | awk '\$4 ~ /:80\$/'  then retry: sudo certbot --nginx -d ${fe_host}"
    fi
}

resolve_project_root() {
    if [[ -n "$TARGET_DIR" ]]; then
        (cd "$TARGET_DIR" && pwd)
        return
    fi
    if [[ -f "$(pwd)/backend/composer.json" ]] && [[ -f "$(pwd)/frontend/package.json" ]]; then
        pwd
        return
    fi
    die "Could not find template root. Use --repo to clone or run from the repository root, or pass --dir."
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo) REPO_URL="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --dir) TARGET_DIR="$2"; shift 2 ;;
        --docker-db) USE_DOCKER_DB=1; shift ;;
        --no-docker-db) USE_DOCKER_DB=0; shift ;;
        --db-url) DB_URL_INPUT="$2"; USE_DOCKER_DB=0; shift 2 ;;
        --skip-system) SKIP_SYSTEM=1; shift ;;
        --no-frontend-build) SKIP_FRONTEND_BUILD=1; shift ;;
        --skip-start-servers) SKIP_START_SERVERS=1; shift ;;
        --no-nginx) SKIP_NGINX=1; shift ;;
        --skip-ssl) INSTALL_SKIP_SSL=1; shift ;;
        --certbot-email) CERTBOT_EMAIL_ARG="$2"; shift 2 ;;
        --ioncube) FORCE_IONCUBE=1; shift ;;
        --skip-ioncube) SKIP_IONCUBE=1; shift ;;
        --backend-url) BACKEND_URL_ARG="$2"; shift 2 ;;
        --frontend-url) FRONTEND_URL_ARG="$2"; shift 2 ;;
        --paynow-key) PAYNOW_KEY_ARG="$2"; shift 2 ;;
        --steam-secret) STEAM_SECRET_ARG="$2"; shift 2 ;;
        --help|-h) usage; exit 0 ;;
        *) die "Unknown option: $1 (try --help)" ;;
    esac
done

[[ "${INSTALL_SKIP_SSL:-}" =~ ^(1|true|yes)$ ]] && INSTALL_SKIP_SSL=1
[[ "${SKIP_NGINX:-}" =~ ^(1|true|yes)$ ]] && SKIP_NGINX=1

REPO_URL="${REPO_URL:-}"
if [[ -z "$REPO_URL" ]]; then
    if [[ -n "$TARGET_DIR" ]] && [[ -f "${TARGET_DIR}/backend/composer.json" ]] && [[ -f "${TARGET_DIR}/frontend/package.json" ]]; then
        :
    elif [[ -f "$(pwd)/backend/composer.json" ]] && [[ -f "$(pwd)/frontend/package.json" ]]; then
        TARGET_DIR="$(pwd)"
    else
        REPO_URL="$DEFAULT_RUST_TEMPLATE_REPO"
        log "Using default repository: ${REPO_URL}"
    fi
fi

if [[ -n "$REPO_URL" ]]; then
    need_cmd git || die "git is required to clone the repository."
    if [[ -z "$TARGET_DIR" ]]; then
        TARGET_DIR="$DEFAULT_INSTALL_DIR"
    fi
    if [[ -d "$TARGET_DIR/.git" ]] || [[ -f "${TARGET_DIR}/backend/composer.json" ]]; then
        log "Using existing directory: ${TARGET_DIR}"
        git -C "$TARGET_DIR" fetch origin 2>/dev/null || true
        git -C "$TARGET_DIR" checkout "$BRANCH" 2>/dev/null || git -C "$TARGET_DIR" checkout -B "$BRANCH" "origin/${BRANCH}" 2>/dev/null || true
        git -C "$TARGET_DIR" pull origin "$BRANCH" 2>/dev/null || true
    else
        mkdir -p "$(dirname "$TARGET_DIR")"
        log "Cloning ${REPO_URL} (branch ${BRANCH}) → ${TARGET_DIR}…"
        git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$TARGET_DIR"
    fi
fi

ROOT="$(resolve_project_root)"
ui_section "${INSTALL_TITLE} — v${SCRIPT_VERSION}"
log "Project root: ${ROOT}"
HOST_IP="$(primary_ipv4)"

ensure_debian_packages

need_cmd php || die "PHP CLI not found. Install PHP 8.2 or newer."
php_meets_minimum || die "PHP 8.2+ required (found: $(php -r 'echo PHP_VERSION;' 2>/dev/null || echo unknown))."

resolve_public_urls "$HOST_IP"
log "Laravel API (local): ${INTERNAL_LARAVEL_URL}"
log "Public site URL:     ${PUBLIC_FRONTEND_URL}"

resolve_paynow_steam

need_cmd node || die "Node.js not found. Install Node 20+ (https://nodejs.org)."
node_meets_minimum || die "Node.js 20+ required (found: $(node -v 2>/dev/null || echo unknown))."

ensure_composer
need_cmd composer || die "composer not available after install attempt."

need_cmd curl || die "curl is required."
need_cmd openssl || true
ensure_ioncube_loader "$ROOT"
if backend_appears_ioncube_encoded "$ROOT" && ! ioncube_loader_active; then
    die "This backend is ionCube-encoded but the Loader is not loaded. Install ionCube for PHP $(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null) from https://get-loader.ioncube.com or re-run with sudo on Debian/Ubuntu."
fi

MYSQL_HOST=""
MYSQL_PORT=""
MYSQL_DATABASE=""
MYSQL_USER=""
MYSQL_PASSWORD=""

if [[ -n "$DB_URL_INPUT" ]]; then
    parse_mysql_url "$DB_URL_INPUT"
elif [[ "$USE_DOCKER_DB" -eq 1 ]]; then
    maybe_generate_docker_mysql_password "$ROOT"
    start_docker_mysql
    MYSQL_HOST="127.0.0.1"
    MYSQL_PORT="$DOCKER_MYSQL_PORT"
    MYSQL_DATABASE="$DOCKER_DB_NAME"
    MYSQL_USER="$DOCKER_DB_USER"
    MYSQL_PASSWORD="$DOCKER_DB_PASS"
else
    die "Provide a database: default is Docker MariaDB (install Docker, or set RUST_TEMPLATE_USE_DOCKER_DB=0 and pass --db-url mysql://user:pass@host:3306/dbname)."
fi

BACKEND_ENV="${ROOT}/backend/.env"
if [[ ! -f "$BACKEND_ENV" ]]; then
    cp "${ROOT}/backend/.env.example" "$BACKEND_ENV"
fi
apply_backend_db_env "$BACKEND_ENV" "$MYSQL_HOST" "$MYSQL_PORT" "$MYSQL_DATABASE" "$MYSQL_USER" "$MYSQL_PASSWORD"
if [[ "$USE_DOCKER_DB" -eq 1 ]]; then
    (
        umask 077
        cat >"${ROOT}/.install-docker-mysql" <<MYSQLCRED
# Written by install.sh — matches backend/.env DB_* for the Docker MariaDB container.
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_DATABASE=${MYSQL_DATABASE}
DB_USERNAME=${MYSQL_USER}
DB_PASSWORD=${MYSQL_PASSWORD}
MARIADB_ROOT_PASSWORD=${MYSQL_PASSWORD}_root
MYSQLCRED
    )
fi
apply_backend_public_env "$BACKEND_ENV" "$INTERNAL_LARAVEL_URL" "$PUBLIC_FRONTEND_URL"
if [[ -n "${PAYNOW_KEY_VAL:-}" || -n "${STEAM_SECRET_VAL:-}" ]]; then
    log "Writing optional PayNow / Steam keys to backend/.env (skipped if unset — use /setup wizard)…"
    apply_backend_paynow_steam_env "$BACKEND_ENV" "$PAYNOW_KEY_VAL" "$STEAM_SECRET_VAL"
else
    log "Skipping PayNow / Steam in backend/.env (configure in /setup wizard)."
fi

setup_backend "$ROOT"
install_laravel_scheduler_cron "$ROOT"
setup_frontend "$ROOT" "$INTERNAL_LARAVEL_URL" "$PUBLIC_FRONTEND_URL"

if [[ -d "${ROOT}/backend/storage/app" ]]; then
    touch "${ROOT}/backend/storage/app/.setup_wizard_pending" 2>/dev/null || true
fi

maybe_setup_nginx_domain_proxy "$ROOT" "$PUBLIC_FRONTEND_URL"
[[ -n "${INSTALL_PUBLIC_FRONTEND_URL_RESULT:-}" ]] && PUBLIC_FRONTEND_URL="$INSTALL_PUBLIC_FRONTEND_URL_RESULT"

if [[ "$SKIP_START_SERVERS" -eq 0 ]]; then
    start_backend_production "$ROOT"
    start_frontend_production "$ROOT"
else
    log "Skipped starting servers (--skip-start-servers)."
fi

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Install finished.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Site:                 ${PUBLIC_FRONTEND_URL}
  Laravel API (local):  ${INTERNAL_LARAVEL_URL}

  First-time setup wizard: ${PUBLIC_FRONTEND_URL}/setup
    (Complete license, Steam, Discord, PayNow, BattleMetrics, and RustMaps steps there.)

  Logs / PIDs:
    - ${ROOT}/backend/storage/logs/install-artisan-serve.log  (backend PID: ${ROOT}/.rust-template-backend-serve.pid)
    - ${ROOT}/frontend/install-next-start.log               (frontend PID: ${ROOT}/.rust-template-frontend-serve.pid)

  Restart later (production-style, all interfaces):
    cd ${ROOT}/backend && PHP_CLI_SERVER_WORKERS="\${PHP_CLI_SERVER_WORKERS:-4}" php artisan serve --no-reload --host=0.0.0.0 --port=8000
    cd ${ROOT}/frontend && npm run start -- --hostname 0.0.0.0 --port 3000

  Laravel scheduler (cron, installed by this script when root/sudo + crontab available):
    * * * * * cd ${ROOT}/backend && php artisan schedule:run >> /dev/null 2>&1
    Runs template auto-update checks, server automations (map vote / wipe workflows), etc.
    Verify: sudo crontab -u \$(stat -c '%U' ${ROOT}/backend) -l

  Nginx (when a domain hostname was used): /etc/nginx/sites-available/rust-template
    Cloudflare real IP snippet: /etc/nginx/snippets/rust-template-cloudflare-real-ip.conf
    Optional site token: ${ROOT}/.install-domain-token

EOF

if [[ "$USE_DOCKER_DB" -eq 1 ]]; then
    cat <<EOF
  MySQL (Docker): container ${DOCKER_MYSQL_CONTAINER}, port ${DOCKER_MYSQL_PORT}
    Credentials: ${ROOT}/.install-docker-mysql (mode 600; same values as backend/.env DB_*)
    Stop: docker stop ${DOCKER_MYSQL_CONTAINER}
    Logs: docker logs -f ${DOCKER_MYSQL_CONTAINER}

EOF
fi
