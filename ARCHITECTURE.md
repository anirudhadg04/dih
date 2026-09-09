# Anvation production architecture

## Current transition

The React/Vite SPA is deployed independently from the Express API. Netlify serves `dist/` and proxies `/api/*` to the backend host. The backend currently retains legacy in-memory/JSON stores while the PostgreSQL schema in `db/001_initial_schema.sql` is migrated into the route services.

## Target

```text
Browser
  -> Netlify React/Vite SPA
  -> HTTPS /api proxy
  -> Node/Express API
      -> PostgreSQL source of truth
      -> object storage for payment proofs
      -> SMTP or transactional email provider
      -> asynchronous CSV/GitHub export
```

PostgreSQL must become authoritative before production traffic is moved. CSV and GitHub are exports only. Email and backup failures must not roll back a committed registration.

## Contract policy

Existing `/api/...` paths and response shapes remain the compatibility boundary. Changes must update every frontend consumer and include an integration test. Public responses must contain aggregate or public event information only; participant and operational records require an authenticated, scoped response.
