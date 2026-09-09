# Database and migration policy

PostgreSQL is the production source of truth. The initial schema is in `db/001_initial_schema.sql` and covers teams, participants, payments, submissions, admins, sessions, scorecards, announcements, and audit logs.

## Local setup

Create a local database and apply the migration:

```powershell
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/anvation"
psql $env:DATABASE_URL -f db/001_initial_schema.sql
```

## Migration rules

- Apply migrations in order in a disposable staging database first.
- Back up production before every migration.
- Keep legacy JSON/CSV exports read-only during reconciliation.
- Compare team, participant, payment, and submission counts after import.
- Do not switch traffic until login, ownership, registration capacity, and role tests pass.
- Do not use `array.length + 1` for production identifiers.

Registration must use one database transaction for capacity check, team creation, participant creation, and payment record creation. Email, CSV, and GitHub exports run after commit and are retryable side effects.
