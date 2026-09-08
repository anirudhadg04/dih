# Netlify migration

The `netlify-supabase-migration` branch contains the deployment foundation:

- `netlify.toml` publishes the Vite `dist/` folder and routes `/api/*` to a
  Netlify Function.
- `netlify/functions/api.ts` exposes the existing Express routes through the
  function adapter.
- `supabase/schema.sql` defines the durable registration tables, a database-side
  team-number allocator, and private payment-screenshot bucket.
- `.env.netlify.example` lists the server-only configuration.

## Important status

The registration and participant-login paths now use Supabase when the server
environment contains both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Team
records, participant rows, payment screenshots, and durable backup rows are
written there, with rollback if the backup write fails. Without those variables,
the local JSON/CSV implementation remains active for development and the VPS.

The function adapter is still a compatibility bridge for the remaining route
families. Those routes continue to use in-process arrays and local persistence,
so the app is **not yet safe as a complete production migration on Netlify**.

Before switching the public site to the Netlify function, migrate the remaining
admin, check-in, submissions, judging, CMS, and session route families to
Supabase-backed storage. The frontend can keep its existing `/api/...` URLs
because `netlify.toml` preserves them.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Netlify environment
   variables. The service-role key must never be exposed as a `VITE_*` variable.
4. Import existing registrations from `server-data.json` through a one-time
   migration script after reviewing and removing any test data.
5. Configure database backups and export `registration_backup_rows` to private
   object storage on a schedule.

## Deploy the frontend foundation

Connect the repository to Netlify. Netlify will use:

```text
Build command: npm run build:netlify
Publish directory: dist
Functions directory: netlify/functions
```

Do not cut over registrations until the route persistence migration is complete
and tested with concurrent registration attempts.
