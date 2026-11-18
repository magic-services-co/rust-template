# Hosting on Coolify or a panel

The site runs as one container: Next.js on the public port, Laravel on `127.0.0.1` inside the container, and the Laravel scheduler beside them. The first start builds the frontend for the public URL. Later starts reuse that build until the URL changes.

Uploads and generated secrets live in `backend/storage`. Mount that path so they survive a new container.

## Coolify

1. Create a project from this repo’s `docker-compose.yml` (Docker Compose build pack).
2. Set `SITE_URL` to the public URL, including `https://`.
3. Set `DB_PASSWORD` and `DB_ROOT_PASSWORD`. The compose file’s defaults are only for a private try-out.
4. Set the domain on the `app` service. The container port is **3000**.
5. Deploy. The first start runs migrations and `next build`, so the health check waits up to 15 minutes.

Coolify’s proxy terminates TLS. Leave MariaDB off the public internet; it is only on the compose network.

If you already have a database in Coolify, you can deploy the `Dockerfile` alone and set `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` yourself. The app still listens on port 3000.

## Pterodactyl (and the same style of panel)

1. Build and push an image:

```bash
docker build -t magicservices/rust-template:latest .
docker login
docker push magicservices/rust-template:latest
```

`docker login` uses a Docker Hub account. The name before the slash must be that account or organization. On [Docker Hub](https://hub.docker.com), set the repository to **Public** so the panel can pull it.

2. Import `docker/pterodactyl/egg-rust-template.json`.
3. Change the egg’s Docker image to the image you pushed.
4. Create a server from that egg. Give it a port allocation and set **Site URL** to the URL players open. The setup wizard at `/setup` asks for the MariaDB or MySQL database.
5. Leave the startup command as `/usr/local/bin/rust-template-entrypoint serve`. The panel passes that in `STARTUP`. The process listens on `SERVER_PORT`.

Uploads persist under `/home/container/storage` because the panel mounts the server volume there.

The panel marks the server online when the log contains `Frontend is listening`.

### Cloudflare origin certificate

The container does not run Let’s Encrypt. Put a Cloudflare origin certificate on the server files and it terminates HTTPS when the allocation is a Cloudflare HTTPS port: 443, 2053, 2083, 2087, 2096, or 8443. Any other port stays HTTP, which is what a direct visit to the allocation uses and what Cloudflare can send to that port. Without the certificate the port stays HTTP, which is also what Coolify’s proxy expects.

1. In Cloudflare: SSL/TLS → Origin Server → Create certificate. Save the certificate as `cert.pem` and the private key as `key.pem`.
2. Upload them in the panel file manager to `/home/container/ssl/cert.pem` and `/home/container/ssl/key.pem`.
3. Set the site URL to `https://your-domain`.
4. Set Cloudflare SSL/TLS mode to **Full (strict)**.
5. Point the DNS record at the panel node, and allocate a port Cloudflare’s proxy can reach: **443, 2053, 2083, 2087, 2096, or 8443**. The origin port in Cloudflare is that same allocation.

Browsers only trust this certificate when the request comes through Cloudflare. A direct visit to the node shows an untrusted certificate, which is how origin certificates work.

## Updates

Redeploy the image. The in-admin “Run update” action is for the VPS installer (`scripts/install.sh`). Inside this container it does not git-pull the app.

## Discord linking bot

The linking bot is a second container (`docker/linking-bot`). The admin page starts it through the host Docker socket, which this site container does not mount. Run that compose file on the host, or start the bot yourself, if you use Discord linking.
