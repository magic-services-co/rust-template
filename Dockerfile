# One container for Coolify and Pterodactyl-style panels.
# Next.js is the public port. Laravel stays on 127.0.0.1 inside the container.
# The frontend production build runs on first start, after the public URL is known.

FROM node:20-bookworm AS nodebin

FROM php:8.3-cli-bookworm

COPY --from=nodebin /usr/local/bin/node /usr/local/bin/node
COPY --from=nodebin /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && node -v && npm -v

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        tini \
        unzip \
        libicu-dev \
        libonig-dev \
        libxml2-dev \
        libzip-dev \
    && docker-php-ext-install -j"$(nproc)" bcmath intl mbstring pdo_mysql xml zip \
    && curl -fsSL "https://downloads.ioncube.com/loader_downloads/ioncube_loaders_lin_x86-64.tar.gz" -o /tmp/ioncube.tar.gz \
    && tar -xzf /tmp/ioncube.tar.gz -C /tmp \
    && ext_dir="$(php -r 'echo ini_get("extension_dir");')" \
    && cp /tmp/ioncube/ioncube_loader_lin_8.3.so "${ext_dir}/" \
    && echo "zend_extension=ioncube_loader_lin_8.3.so" > /usr/local/etc/php/conf.d/00-ioncube.ini \
    && rm -rf /tmp/ioncube /tmp/ioncube.tar.gz \
    && printf 'memory_limit=512M\nupload_max_filesize=32M\npost_max_size=40M\n' > /usr/local/etc/php/conf.d/uploads.ini \
    && php -m | grep -i ionCube \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/rust-template

COPY backend /var/www/rust-template/backend
RUN cd /var/www/rust-template/backend \
    && mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && cp .env.example .env \
    && COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts \
    && COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload --optimize --no-dev --no-scripts \
    && rm -f .env

COPY frontend/package.json frontend/package-lock.json /var/www/rust-template/frontend/
RUN cd /var/www/rust-template/frontend && npm ci

COPY frontend /var/www/rust-template/frontend
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*
COPY docker/entrypoint.sh /usr/local/bin/rust-template-entrypoint
COPY docker/render-env.php /usr/local/bin/rust-template-render-env.php
COPY docker/container-paths.php /usr/local/bin/rust-template-container-paths.php

RUN chmod 755 /usr/local/bin/rust-template-entrypoint \
    && chmod a+rwx /var/www/rust-template/backend /var/www/rust-template/backend/public /var/www/rust-template/frontend /var/www/rust-template/frontend/node_modules \
    && find /var/www/rust-template/frontend \
        \( -name node_modules -o -name .nvm \) -prune -o \
        \( -type d -o -type f \) -exec chmod a+rwX {} + \
    && mkdir -p \
        /var/www/rust-template/backend/storage/app/public \
        /var/www/rust-template/backend/storage/app/private \
        /var/www/rust-template/backend/storage/app/container-secrets \
        /var/www/rust-template/backend/storage/framework/cache/data \
        /var/www/rust-template/backend/storage/framework/sessions \
        /var/www/rust-template/backend/storage/framework/views \
        /var/www/rust-template/backend/storage/logs \
        /var/www/rust-template/backend/bootstrap/cache \
    && chmod -R a+rwX /var/www/rust-template/backend/storage /var/www/rust-template/backend/bootstrap/cache \
    && mkdir -p /home/container/ssl \
    && chmod a+rwx /home/container /home/container/ssl

COPY config/release.json /var/www/rust-template/config/release.json

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    RUST_TEMPLATE_CONTAINER=1 \
    PHP_CLI_SERVER_WORKERS=4 \
    PORT=3000

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "-g", "--", "/usr/local/bin/rust-template-entrypoint"]
CMD ["start"]
