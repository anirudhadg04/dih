# Database migrations

PostgreSQL is the planned production source of truth. Apply migrations in filename order against a staging database first, then production.

```powershell
psql "$env:DATABASE_URL" -f db/001_initial_schema.sql
```

The current Express handlers still use the legacy JSON/in-memory stores. Migrating handlers to these tables is the next backend phase; do not treat `server-data.json` or the CSV backup as production persistence.

Registration migration must run inside one transaction and enforce capacity, unique participant email/USN, unique team registration number, and unique payment UTR constraints.
