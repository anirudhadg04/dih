# Netlify migration

The `netlify-supabase-migration` branch contains the deployment foundation:

- `netlify.toml` publishes the Vite `dist/` folder and routes `/api/*` to a
  Netlify Function.
- `netlify/functions/api.ts` exposes the existing Express routes through the
  function adapter.
- `supabase/schema.sql` defines the durable registration tables and private
  payment-screenshot bucket.
- `.env.netlify.example` lists the server-only configuration.

## Important status

The function adapter is a compatibility bridge. The existing Express route
implementation still uses its in-process arrays and local JSON/CSV persistence.
That is appropriate for the current VPS deployment, but it is **not yet safe as
the primary production datastore on Netlify**, because function instances are
stateless and their local filesystem is temporary.

Before switching the public site to the Netlify function, migrate the route
families to Supabase transactions and storage, starting with registration,
participant login, admin login, teams, and payment screenshots. The frontend
can keep its existing `/api/...` URLs because `netlify.toml` preserves them.

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
