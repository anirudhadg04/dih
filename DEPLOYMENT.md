# ANVATION 2026 — Scaling & Production Guide

This document explains how to run the site so it stays **fast and reliable even
with thousands of concurrent visitors**, and what has already been wired in.

## What's already built in (default-on)

1. **Response compression (gzip)** — `server.ts` compresses all responses
   above 1 KB. The 750 KB JS / 190 KB CSS become ~200 KB / ~23 KB on the wire.
   This is typically the single biggest win for many simultaneous users.

2. **Immutable asset caching** — Vite hashes every produced asset
   (`index-XXXX.js`, `index-XXXX.css`, images). Those files get
   `Cache-Control: public, max-age=31536000, immutable`, so repeat visitors and
   returning students never re-download them. `index.html` is never cached, so
   new deploys show up instantly.

3. **Rate limiting / abuse protection** — a global per-IP API throttle
   (300 req/min) and a stricter auth/email throttle (20 req/min) prevent a
   single client or scripted bot from pinning the CPU during registration
   bursts.

4. **Security headers + origin-safe proxy** — `X-Content-Type-Options`,
   `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection` are set on every
   response, `X-Powered-By` is removed, and `trust proxy` is enabled so that
   when you put the app behind nginx/caddy the real visitor IP is used for rate
   limiting and audit logs.

5. **Reliable data persistence** — registration/check-in/scoring/admin writes
   are flushed to disk within ~200 ms (debounced) instead of only every 5 s,
   written atomically (temp file + rename, so a crash can never corrupt the
   store), and forced again on graceful shutdown. The server also survives
   `SIGINT`/`SIGTERM` cleanly without losing data.

6. **Multi-core (cluster) mode** — *optional*, see below.

## Standard deployment (recommended baseline)

Serve the pre-built `dist/` behind a reverse proxy that terminates TLS:

```
npm ci            # install exact deps
npm run build     # builds dist/ (static) + dist/server.cjs (Node server)
NODE_ENV=production PORT=3001 node dist/server.cjs
```

Run it under a process manager (pm2 / systemd) so it auto-restarts on reboot
and crashes. Two processes behind a load balancer give you redundancy for the
event itself.

### Minimal nginx front

```nginx
upstream anvation { server 127.0.0.1:3001 keepalive 64; }

server {
    listen 80;
    server_name anvation.kssem.edu.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name anvation.kssem.edu.in;
    ssl_certificate     /etc/letsencrypt/live/anvation.kssem.edu.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anvation.kssem.edu.in/privkey.pem;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location /assets/ {
        proxy_pass http://anvation;
        proxy_set_header Host $host;
        expires 1y;               # extra layer of caching for hashed assets
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://anvation;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
    }
}
```

## Scaling to 10,000 concurrent users

10k mostly-idle visitors is very achievable for this stack. The event is
**read-heavy** (page loads, schedules, leaderboards, home page) with **bursty
but low-volume writes** (registration, check-in, scoring), which is exactly the
shape this architecture is designed for.

1. **Use the multi-core cluster mode.** Node runs on one thread by default;
   the cluster mode uses every core for serving static files + relaying API
   calls, while a single authoritative process keeps all data consistent
   (no duplicate registrations / no lost check-ins).

   ```
   CLUSTER_WORKERS=auto NODE_ENV=production PORT=3001 node dist/server.cjs
   ```

   Or pin a number: `CLUSTER_WORKERS=8`. In cluster mode the authority listens
   on a **private loopback port** (default `3002`, override with
   `INTERNAL_PORT=3002`) and the workers share the public port. If cluster can't
   start on a given Node build it **automatically falls back** to the single
   process — enabling it is safe.

2. **Terminate TLS + gzip at the edge (nginx/caddy)** and keep HTTP/2 enabled.
   Static files are served by Node but an nginx-layer `expires` cache for
   `/assets/` adds another layer, and keep-alive reduces per-connection cost.

3. **If you need more than one machine** (horizontal scale), move the mutable
   state out of the file store into a shared database, because the current
   in-memory + `server-data.json` store is single-node by design:

   * Add **PostgreSQL** (or SQLite with WAL if staying single-node).
   * New tables: `teams`, `members`, `submissions`, `checkins`, `scorecards`,
     `announcements`, `cms_config`.
   * Replace the `teams.push(...)` / `markDirty()` mutations with `INSERT/UPDATE`
     queries, and read aggregations (`GET /api/teams`) with `SELECT`.
   * Point all cluster workers (or multiple hosts) at the DB. At that point you
     can run many identical instances behind a load balancer with full
     redundancy.

4. **Monitor during the event.** Health check at `/api/health`. Watch memory of
   each process, disk on the data file host, and network egress (compression
   keeps this low).

## Quick reference (new env vars)

| Variable           | Default | Meaning                                                      |
|--------------------|---------|--------------------------------------------------------------|
| `PORT`             | `3001`  | Public port for single-process mode / cluster workers.        |
| `INTERNAL_PORT`    | `3002`  | Private loopback port used by the cluster authority.          |
| `CLUSTER_WORKERS`  | off     | `auto` (all cores − 1) or a number of worker processes; empty disables. |
| `NODE_ENV`         | —       | `production` serves the built `dist/`; otherwise Vite dev.    |
| `SMTP_*`           | —       | Email delivery (see `.env.example`).                          |

> Existing `.env` values are only read if the matching OS env var is not already
> set, so `CLUSTER_WORKERS` / `INTERNAL_PORT` in `.env` will be respected.