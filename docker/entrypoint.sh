#!/usr/bin/env bash
# Prepare Laravel + Next.js, then run them in the foreground.
# With no args, or with "start", this becomes the site process.
# Any other command is executed after setup (for a shell or a one-off artisan call).
set -euo pipefail

APP_ROOT="/var/www/rust-template"
export APP_ROOT
export RUST_TEMPLATE_CONTAINER=1
export NEXT_TELEMETRY_DISABLED=1
export npm_config_cache="${npm_config_cache:-/tmp/npm-cache}"
export HOME="${HOME:-/tmp}"

# Laravel reads bootstrap-cache paths from $_ENV. A read-only image makes the
# default directory unwritable, and a process that never exported APP_*_CACHE
# still crashes in PackageManifest. This prepend sets $_ENV before every PHP start.
install_php_path_prepend() {
    mkdir -p /tmp/php-conf
    printf '%s\n' 'auto_prepend_file=/usr/local/bin/rust-template-container-paths.php' > /tmp/php-conf/zz-container-paths.ini
    case ":${PHP_INI_SCAN_DIR:-}:" in
        *:/tmp/php-conf:*) ;;
        *)
            if [[ -n "${PHP_INI_SCAN_DIR:-}" ]]; then
                PHP_INI_SCAN_DIR="${PHP_INI_SCAN_DIR}:/tmp/php-conf"
            else
                PHP_INI_SCAN_DIR="/usr/local/etc/php/conf.d:/tmp/php-conf"
            fi
            export PHP_INI_SCAN_DIR
            ;;
    esac
}
install_php_path_prepend

# Pterodactyl sets SERVER_PORT to the allocation. The image default PORT=3000 must not hide it.
if [[ -n "${SERVER_PORT:-}" ]]; then
    PORT="$SERVER_PORT"
fi
PORT="${PORT:-3000}"
export PORT

LARAVEL_PORT="${LARAVEL_PORT:-8000}"
if [[ "$LARAVEL_PORT" == "$PORT" ]]; then
    LARAVEL_PORT=18080
fi
export LARAVEL_PORT

resolve_site_url() {
    if [[ -n "${SITE_URL:-}" ]]; then
        return 0
    fi
    if [[ -n "${FRONTEND_URL:-}" ]]; then
        SITE_URL="$FRONTEND_URL"
        return 0
    fi
    local candidate="${SERVICE_URL_APP:-${SERVICE_FQDN_APP:-${COOLIFY_URL:-}}}"
    candidate="${candidate%%,*}"
    candidate="${candidate%"${candidate##*[![:space:]]}"}"
    if [[ -n "$candidate" ]]; then
        SITE_URL="$candidate"
        return 0
    fi
    SITE_URL="http://localhost:${PORT}"
}

resolve_site_url
export SITE_URL
export NEXT_PUBLIC_LEADERBOARD_FAKE_DATA="${NEXT_PUBLIC_LEADERBOARD_FAKE_DATA:-false}"

persist_panel_storage() {
    local src="${APP_ROOT}/backend/storage"
    if [[ ! -d /home/container || ! -w /home/container ]]; then
        return 0
    fi
    mkdir -p /home/container/storage
    if [[ -L "$src" ]]; then
        return 0
    fi
    if [[ -z "$(ls -A /home/container/storage 2>/dev/null || true)" ]]; then
        cp -a "${src}/." /home/container/storage/ 2>/dev/null || true
    fi
    if rm -rf "$src" 2>/dev/null; then
        ln -s /home/container/storage "$src"
    fi
}

choose_storage() {
    local image="${APP_ROOT}/backend/storage"
    local probe="${image}/.write-probe"
    persist_panel_storage
    if mkdir -p "$image" 2>/dev/null && touch "$probe" 2>/dev/null; then
        rm -f "$probe"
        return 0
    fi
    if [[ -d /home/container && -w /home/container ]]; then
        mkdir -p \
            /home/container/storage/app/public \
            /home/container/storage/app/private \
            /home/container/storage/framework/cache/data \
            /home/container/storage/framework/sessions \
            /home/container/storage/framework/views \
            /home/container/storage/logs
        export LARAVEL_STORAGE_PATH=/home/container/storage
        echo "Image storage is read-only. Using /home/container/storage."
        return 0
    fi
    mkdir -p /tmp/rust-template-storage/app /tmp/rust-template-storage/framework/sessions /tmp/rust-template-storage/logs
    export LARAVEL_STORAGE_PATH=/tmp/rust-template-storage
    echo "No persistent writable storage. Using /tmp for this start." >&2
}

storage_root() {
    if [[ -n "${LARAVEL_STORAGE_PATH:-}" ]]; then
        printf '%s\n' "$LARAVEL_STORAGE_PATH"
    else
        printf '%s\n' "${APP_ROOT}/backend/storage"
    fi
}

panel_server() {
    [[ -n "${P_SERVER_UUID:-}" || -n "${P_SERVER_ID:-}" || -n "${STARTUP:-}" ]]
}

prepare_bootstrap_cache() {
    local cache="${APP_ROOT}/backend/bootstrap/cache"
    if [[ -d "$cache" && -w "$cache" ]]; then
        return 0
    fi
    local dest
    dest="$(storage_root)/bootstrap/cache"
    mkdir -p "$dest"
    export APP_PACKAGES_CACHE="${dest}/packages.php"
    export APP_SERVICES_CACHE="${dest}/services.php"
    export APP_CONFIG_CACHE="${dest}/config.php"
    export APP_ROUTES_CACHE="${dest}/routes-v7.php"
    export APP_EVENTS_CACHE="${dest}/events.php"
    echo "Bootstrap cache is read-only. Using ${dest}."
}

ensure_writable_dirs() {
    local root
    root="$(storage_root)"
    mkdir -p \
        "${root}/app/public" \
        "${root}/app/private" \
        "${root}/app/container-secrets" \
        "${root}/framework/cache/data" \
        "${root}/framework/sessions" \
        "${root}/framework/views" \
        "${root}/logs" \
        "${APP_ROOT}/backend/bootstrap/cache" \
        /tmp/container-secrets
    chmod -R a+rwX "$root" "${APP_ROOT}/backend/bootstrap/cache" 2>/dev/null || true
}

wait_for_database() {
    local host="${DB_HOST:-}"
    local port="${DB_PORT:-3306}"
    if [[ -z "$host" ]]; then
        echo "DB_HOST is empty. Set the database host before starting." >&2
        exit 1
    fi
    echo "Waiting for database at ${host}:${port}…"
    local i
    for i in $(seq 1 60); do
        if php -r '$f=@fsockopen(getenv("DB_HOST"), (int) (getenv("DB_PORT") ?: 3306), $e, $s, 2); if ($f) { fclose($f); exit(0); } exit(1);'; then
            echo "Database is accepting connections."
            return 0
        fi
        sleep 2
    done
    echo "Database at ${host}:${port} did not accept connections in time." >&2
    exit 1
}

frontend_source_id() {
    if [[ ! -d "${APP_ROOT}/frontend/src" ]]; then
        echo "none"
        return
    fi
    find "${APP_ROOT}/frontend/src" -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}'
}

prepare_frontend_root() {
    FRONTEND_ROOT="${APP_ROOT}/frontend"
    if touch "${FRONTEND_ROOT}/.write-probe" 2>/dev/null; then
        rm -f "${FRONTEND_ROOT}/.write-probe"
        return 0
    fi
    local dest="/tmp/rust-template-frontend"
    if [[ -d /home/container && -w /home/container ]]; then
        dest="/home/container/frontend"
    fi
    mkdir -p "$dest"
    # Turbopack will not follow a node_modules symlink that leaves this directory.
    if [[ -L "$dest/node_modules" || ! -f "$dest/node_modules/next/package.json" ]]; then
        rm -rf "$dest/node_modules"
        echo "Copying frontend dependencies onto writable storage…"
        cp -a "${APP_ROOT}/frontend/node_modules" "$dest/node_modules"
    fi
    local src_id
    src_id="$(frontend_source_id)"
    if [[ ! -f "$dest/package.json" ]] || ! cmp -s "${APP_ROOT}/frontend/package.json" "$dest/package.json" || [[ "$(cat "$dest/.source-id" 2>/dev/null || true)" != "$src_id" ]]; then
        echo "Frontend directory is read-only. Using ${dest}."
        tar -C "${APP_ROOT}/frontend" --exclude node_modules --exclude .next -cf - . | tar -C "$dest" -xf -
        printf '%s\n' "$src_id" > "$dest/.source-id"
    fi
    FRONTEND_ROOT="$dest"
}

build_frontend_if_needed() {
    prepare_frontend_root
    local stamp="${FRONTEND_ROOT}/.next/.panel-stamp"
    local version
    version="$(node -p "require('${APP_ROOT}/frontend/package.json').version")"
    local want
    want="${SITE_URL}"$'\n'"${NEXT_PUBLIC_LEADERBOARD_FAKE_DATA}"$'\n'"${version}"$'\n'"$(frontend_source_id)"
    if [[ -f "${FRONTEND_ROOT}/.next/BUILD_ID" && -f "$stamp" ]] && [[ "$(cat "$stamp")" == "$want" ]]; then
        echo "Frontend build matches ${SITE_URL}; skipping next build."
        return 0
    fi
    echo "Building the frontend for ${SITE_URL} (first start, or the public URL changed)…"
    (
        cd "${FRONTEND_ROOT}"
        export TEMPLATE_UPDATE_SKIP_TYPECHECK=1
        export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
        ./node_modules/.bin/next build
    )
    mkdir -p "${FRONTEND_ROOT}/.next"
    printf '%s\n' "$want" > "$stamp"
}

# Cloudflare can terminate visitor HTTPS and connect to the origin with HTTPS
# only on these ports. Any other allocation, including 10000, must stay HTTP
# or Cloudflare and a direct browser visit both fail the handshake.
cloudflare_https_port() {
    case "${PORT}" in
        443|2053|2083|2087|2096|8443) return 0 ;;
        *) return 1 ;;
    esac
}

public_host() {
    local host="${SITE_URL}"
    host="${host#*://}"
    host="${host%%/*}"
    host="${host%%:*}"
    printf '%s' "$host"
}

# A real domain locks the public name to that host. An IP or localhost keeps
# the allocation open for whatever host reaches this port.
domain_host() {
    local host
    host="$(public_host)"
    if [[ -z "$host" || "$host" == "localhost" || "$host" == "127.0.0.1" ]]; then
        return 0
    fi
    if [[ "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        return 0
    fi
    printf '%s' "$host"
}

# Cloudflare origin certificate. It turns the public port into HTTPS only when
# that port is one Cloudflare can connect to. Otherwise the port stays HTTP.
TLS_ENABLED=0
USE_NGINX=0
DOMAIN_HOST=""
NEXT_PORT="${PORT}"
SSL_CERT=""
SSL_KEY=""

prepare_origin_tls() {
    TLS_ENABLED=0
    USE_NGINX=0
    DOMAIN_HOST="$(domain_host)"
    NEXT_PORT="${PORT}"
    local cert="${SSL_CERT_PATH:-/home/container/ssl/cert.pem}"
    local key="${SSL_KEY_PATH:-/home/container/ssl/key.pem}"
    if [[ ! -f "$cert" || ! -f "$key" ]]; then
        if [[ -n "${ORIGIN_CERT_B64:-}" && -n "${ORIGIN_KEY_B64:-}" ]]; then
            mkdir -p /tmp/origin-ssl
            printf '%s' "${ORIGIN_CERT_B64}" | base64 -d > /tmp/origin-ssl/cert.pem
            printf '%s' "${ORIGIN_KEY_B64}" | base64 -d > /tmp/origin-ssl/key.pem
            chmod 600 /tmp/origin-ssl/key.pem || true
            cert=/tmp/origin-ssl/cert.pem
            key=/tmp/origin-ssl/key.pem
        fi
    fi
    local have_cert=0
    if [[ -f "$cert" && -f "$key" ]]; then
        have_cert=1
        SSL_CERT="$cert"
        SSL_KEY="$key"
    fi
    if [[ "$have_cert" -eq 1 ]] && cloudflare_https_port; then
        TLS_ENABLED=1
        USE_NGINX=1
    elif [[ -n "$DOMAIN_HOST" || "$have_cert" -eq 1 ]]; then
        # A domain needs nginx so other hostnames are sent there. A certificate
        # on a non-Cloudflare port is not used; HTTP is what reaches this port.
        USE_NGINX=1
    fi
    if [[ "$USE_NGINX" == "1" ]]; then
        NEXT_PORT=3100
        if [[ "$NEXT_PORT" == "$PORT" || "$NEXT_PORT" == "$LARAVEL_PORT" ]]; then
            NEXT_PORT=3101
        fi
    fi
    if [[ "$TLS_ENABLED" == "1" ]]; then
        if [[ -n "$DOMAIN_HOST" ]]; then
            echo "HTTPS on port ${PORT} for ${DOMAIN_HOST}."
        else
            echo "Cloudflare origin certificate found. HTTPS on port ${PORT}."
        fi
        return 0
    fi
    if [[ -n "$DOMAIN_HOST" ]]; then
        echo "Serving HTTP on port ${PORT} for ${DOMAIN_HOST}."
        if [[ "$have_cert" -eq 1 ]]; then
            echo "Port ${PORT} is not a Cloudflare HTTPS port, so the origin certificate is not used. Point Cloudflare at this port and set SSL mode to Full. For Full (strict), allocate 443, 2053, 2083, 2087, 2096, or 8443."
        fi
        if [[ -n "${SERVER_IP:-}" ]]; then
            echo "This allocation also answers http://${SERVER_IP}:${PORT}."
        fi
        return 0
    fi
    if [[ "$have_cert" -eq 1 ]]; then
        echo "Port ${PORT} is not a Cloudflare HTTPS port, so the origin certificate is not used. Serving HTTP on port ${PORT}."
        return 0
    fi
    echo "No Cloudflare origin certificate at ${cert}. Serving HTTP on port ${PORT}."
}

write_cloudflare_realip() {
    local dest="$1"
    local v4="" v6="" cidr
    v4="$(curl -fsSL --max-time 8 https://www.cloudflare.com/ips-v4/ || true)"
    v6="$(curl -fsSL --max-time 8 https://www.cloudflare.com/ips-v6/ || true)"
    {
        echo "# Cloudflare published ranges for CF-Connecting-IP"
        if [[ -n "${v4}${v6}" ]]; then
            while IFS= read -r cidr; do
                cidr="${cidr//$'\r'/}"
                if [[ "$cidr" =~ ^[0-9a-fA-F:.]+/[0-9]+$ ]]; then
                    echo "set_real_ip_from ${cidr};"
                fi
            done <<< "${v4}"$'\n'"${v6}"
            echo "real_ip_header CF-Connecting-IP;"
            echo "real_ip_recursive on;"
        fi
    } > "$dest"
}

write_origin_nginx_conf() {
    local conf="/tmp/nginx/nginx.conf"
    mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi
    write_cloudflare_realip /tmp/nginx/cloudflare-realip.conf
    local listen="${PORT}"
    local ssl_lines=""
    if [[ "$TLS_ENABLED" == "1" ]]; then
        listen="${PORT} ssl http2"
        ssl_lines="
        ssl_certificate ${SSL_CERT};
        ssl_certificate_key ${SSL_KEY};
        ssl_protocols TLSv1.2 TLSv1.3;"
    fi
    local host_gate=""
    if [[ -n "$DOMAIN_HOST" ]]; then
        local www_name=""
        if [[ "$DOMAIN_HOST" != www.* ]]; then
            www_name="www.${DOMAIN_HOST} 0;"
        fi
        host_gate="
    map \$host \$send_to_domain {
        default 1;
        ${DOMAIN_HOST} 0;
        ${www_name}
        localhost 0;
        127.0.0.1 0;
        ~^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$ 0;
    }
"
    fi
    local redirect_rule=""
    if [[ -n "$DOMAIN_HOST" ]]; then
        redirect_rule="
        if (\$send_to_domain = 1) {
            return 301 ${SITE_URL}\$request_uri;
        }
"
    fi
    cat > "$conf" << EOF
worker_processes 1;
error_log /dev/stderr info;
pid /tmp/nginx/nginx.pid;
daemon off;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /dev/stdout;
    client_max_body_size 32m;
    client_body_temp_path /tmp/nginx/client_body;
    proxy_temp_path /tmp/nginx/proxy;
    fastcgi_temp_path /tmp/nginx/fastcgi;
    uwsgi_temp_path /tmp/nginx/uwsgi;
    scgi_temp_path /tmp/nginx/scgi;
    include /tmp/nginx/cloudflare-realip.conf;
    map \$http_x_forwarded_proto \$forwarded_proto {
        default \$http_x_forwarded_proto;
        ""      \$scheme;
    }
${host_gate}
    server {
        listen ${listen};
        server_name _;${ssl_lines}
${redirect_rule}
        location / {
            proxy_pass http://127.0.0.1:${NEXT_PORT};
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$forwarded_proto;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400;
        }
    }
}
EOF
}

port_open() {
    local port="$1"
    (echo >"/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1
}

wait_for_local_port() {
    local port="$1"
    local pid="$2"
    local label="$3"
    local i
    for i in $(seq 1 60); do
        if port_open "$port"; then
            return 0
        fi
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "${label} exited before it accepted connections." >&2
            return 1
        fi
        sleep 0.5
    done
    echo "${label} did not listen on port ${port}." >&2
    return 1
}

start_site() {
    prepare_origin_tls
    local laravel_pid schedule_pid next_pid nginx_pid=""
    local next_host="0.0.0.0"
    if [[ "$USE_NGINX" == "1" ]]; then
        next_host="127.0.0.1"
        write_origin_nginx_conf
    fi
    (
        cd "${APP_ROOT}/backend/public"
        export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-4}"
        # php -S, not artisan serve. ServeCommand parses every stderr line and exits
        # when a Laravel stack trace does not match its access-log format.
        exec php -S "127.0.0.1:${LARAVEL_PORT}" ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
    ) &
    laravel_pid=$!
    if ! wait_for_local_port "$LARAVEL_PORT" "$laravel_pid" "Laravel"; then
        kill "$laravel_pid" 2>/dev/null || true
        exit 1
    fi
    (
        cd "${APP_ROOT}/backend"
        exec php artisan schedule:work
    ) &
    schedule_pid=$!
    prepare_frontend_root
    build_frontend_if_needed
    (
        cd "${FRONTEND_ROOT}"
        exec ./node_modules/.bin/next start --hostname "${next_host}" --port "${NEXT_PORT}"
    ) &
    next_pid=$!

    cleanup() {
        kill "$laravel_pid" "$schedule_pid" "$next_pid" ${nginx_pid:+"$nginx_pid"} 2>/dev/null || true
        wait "$laravel_pid" "$schedule_pid" "$next_pid" ${nginx_pid:+"$nginx_pid"} 2>/dev/null || true
    }
    trap 'cleanup; exit 0' TERM INT

    local ready=0 i
    for i in $(seq 1 180); do
        if ! kill -0 "$next_pid" 2>/dev/null; then
            echo "Next.js exited before it accepted connections." >&2
            cleanup
            exit 1
        fi
        if port_open "$NEXT_PORT"; then
            ready=1
            break
        fi
        sleep 1
    done
    if [[ "$ready" -ne 1 ]]; then
        echo "Next.js did not listen on port ${NEXT_PORT}." >&2
        cleanup
        exit 1
    fi

    if [[ "$USE_NGINX" == "1" ]]; then
        nginx -c /tmp/nginx/nginx.conf &
        nginx_pid=$!
        ready=0
        for i in $(seq 1 20); do
            if ! kill -0 "$nginx_pid" 2>/dev/null; then
                echo "nginx failed to start. Port ${PORT} must be free." >&2
                cleanup
                exit 1
            fi
            if port_open "$PORT"; then
                ready=1
                break
            fi
            sleep 0.2
        done
        if [[ "$ready" -ne 1 ]]; then
            echo "nginx did not listen on port ${PORT}." >&2
            cleanup
            exit 1
        fi
    fi

    echo "Frontend is listening on port ${PORT}"

    set +e
    if [[ -n "$nginx_pid" ]]; then
        wait -n "$laravel_pid" "$schedule_pid" "$next_pid" "$nginx_pid"
    else
        wait -n "$laravel_pid" "$schedule_pid" "$next_pid"
    fi
    local status=$?
    set -e
    echo "A site process exited (${status}). Stopping the container." >&2
    cleanup
    exit 1
}

prepare() {
    choose_storage
    ensure_writable_dirs
    prepare_bootstrap_cache
    local saved_db
    saved_db="$(storage_root)/app/database.json"
    if panel_server && [[ ! -f "$saved_db" ]]; then
        unset DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD
    fi
    php /usr/local/bin/rust-template-render-env.php
    if [[ -f /tmp/rust-template.env ]]; then
        set -a
        # shellcheck disable=SC1091
        source /tmp/rust-template.env
        set +a
    fi
    (
        cd "${APP_ROOT}/backend"
        php artisan package:discover --ansi || true
        if [[ -n "${DB_HOST:-}" ]]; then
            wait_for_database
            php artisan migrate --force
        fi
        if [[ ! -L public/storage ]]; then
            php artisan storage:link || true
        fi
    )
    local root
    root="$(storage_root)"
    pending="${root}/app/.setup_wizard_pending"
    completed="${root}/app/.setup_wizard_completed"
    if [[ ! -f "$pending" && ! -f "$completed" ]]; then
        touch "$pending"
        echo "First start: the setup wizard is ready at /setup."
    fi
}

# "serve" is the long-running process. Pterodactyl execs this after setup, via STARTUP.
# Checking it first avoids looping, because the new process still inherits STARTUP.
# Paths are prepared here too: this branch does not run prepare(), and artisan
# serve / schedule:work boot immediately.
if [[ "${1:-}" == "serve" ]]; then
    choose_storage
    ensure_writable_dirs
    prepare_bootstrap_cache
    start_site
fi

prepare

# Wings stores the egg startup command in STARTUP and does not run it as the container command.
if [[ -n "${STARTUP:-}" ]]; then
    parsed="$(echo "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g' | eval echo "$(cat -)")"
    printf 'container@panel~ %s\n' "$parsed"
    # shellcheck disable=SC2086
    exec ${parsed}
fi

if [[ $# -eq 0 || "${1:-}" == "start" ]]; then
    start_site
fi

exec "$@"
