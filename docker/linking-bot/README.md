# Linking Bot (Docker)

This runs the [rust-template-external](https://github.com/magic-services-co/rust-template-external) Discord Linking Bot in Docker.

## Build the image

Your server may not have the `docker/` folder. Use a **single Dockerfile in the project root**:

**1. Create the Dockerfile** in the project root (`/var/www/rust-template`):

```bash
cd /var/www/rust-template
cat > Dockerfile.linking-bot << 'EOF'
FROM oven/bun:1-alpine AS builder
WORKDIR /app
ARG REPO_URL=https://github.com/magic-services-co/rust-template-external.git
RUN apk add --no-cache git && \
    git clone --depth 1 "${REPO_URL}" . && \
    bun install --frozen-lockfile 2>/dev/null || bun install

FROM oven/bun:1-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app /app
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "index.ts"]
EOF
```

**2. Build:**

```bash
docker build -t linking-bot:latest -f Dockerfile.linking-bot .
```

If you get "no such file or directory" even though the file exists, use **absolute paths**:

```bash
docker build -t linking-bot:latest -f /var/www/rust-template/Dockerfile.linking-bot /var/www/rust-template
```

If you already have `docker/linking-bot/Dockerfile` in the repo, you can instead run:

```bash
docker build -t linking-bot:latest -f docker/linking-bot/Dockerfile .
```

## Run from Admin

1. Run the backend migration: `php artisan migrate` (creates `discord_bot_config` table).
2. In Admin → System Control → Discord Bot, set **API Key**, **BOT_TOKEN**, **CLIENT_ID**, **GUILD_IDS**, and **API_ENDPOINT**, then click **Save config**.
3. Click **Start**. The backend will write `config.json` to `storage/app/private/discord-bot/` and start the container with that config mounted at `/app/config.json`.

## Requirements

- Docker installed and the PHP/web user allowed to run `docker` (e.g. add the user to the `docker` group).
- Image built as above before first Start.

## Optional env (backend `.env`)

- `DISCORD_BOT_CONTAINER_NAME=linking-bot` — container name (default: `linking-bot`)
- `DISCORD_BOT_IMAGE=linking-bot:latest` — image to use (default: `linking-bot:latest`)
