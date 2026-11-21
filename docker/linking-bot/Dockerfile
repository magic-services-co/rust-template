FROM oven/bun:1-alpine AS builder

WORKDIR /app

ARG REPO_URL=https://github.com/magic-services-co/rust-template-external.git

RUN apk add --no-cache git && \
    git clone --depth 1 "${REPO_URL}" . && \
    bun install --frozen-lockfile 2>/dev/null || bun install

COPY docker/linking-bot/overlay/TicketApi.ts /app/ADDONS/tickets/TicketApi.ts
COPY docker/linking-bot/overlay/TicketsAddon.ts /app/ADDONS/tickets/TicketsAddon.ts
COPY docker/linking-bot/overlay/Api.ts /app/tools/Api.ts

FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app /app

# config.json is mounted at runtime
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "index.ts"]
