# Deployment

## Frontend: Netlify

- Build command: `npm run build:client`
- Publish directory: `dist`
- Node version: `20`
- Configure `VITE_API_BASE_URL` only if the client needs an explicit API origin.
- Replace `https://api.example.com` in `netlify.toml` with the real backend origin before production.
- Keep SPA fallback enabled through `netlify.toml`.

Only `VITE_*` values may be placed in Netlify. They are public browser configuration. Never put `DATABASE_URL`, `SESSION_SECRET`, SMTP passwords, bootstrap passwords, or GitHub credentials in Netlify.

## Backend: persistent Node host

Run the existing Express service on Render, Railway, Fly.io, or an equivalent persistent Node provider:

```text
npm ci
npm run build
npm start
```

Set `PORT`, `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`, `CORS_ORIGIN`, and the required SMTP settings on that host. The process must listen on `process.env.PORT` and expose `GET /api/health` for liveness/readiness checks.

## Database

1. Create a managed PostgreSQL database with SSL and automated backups.
2. Apply `db/001_initial_schema.sql` in staging.
3. Import and reconcile the existing JSON/CSV records.
4. Run registration, login, payment, judging, and role-boundary tests.
5. Apply the migration to production during a controlled cutover.

## DNS

Use a same-site arrangement where possible:

```text
anvation.example.com      -> Netlify
api.anvation.example.com  -> backend host
```

Set `CORS_ORIGIN` to the exact canonical frontend origin. Do not use wildcard CORS for cookie-authenticated mutations.

## Release gates

Run `npm run lint`, `npm run build:client`, and `npm run build` before deployment. Deploy staging first, verify health and API proxying, then promote production. Keep a database backup and rollback procedure for every schema change.
