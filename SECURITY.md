# Security baseline

## Current blockers before production

- The legacy handlers still use process-local state and must be migrated to PostgreSQL.
- Payment verification is not an external payment confirmation workflow.
- Every public endpoint returning participants, submissions, tickets, reports, or scorecards must be scoped or redacted.
- `requireAdmin` is currently broader than the required permission matrix.
- Cookie sessions are process-local and must move to a shared database or Redis store.
- Registration, payment transitions, score changes, and admin mutations need schema validation and audit records.

## Required controls

- Hash passwords and rotate sessions after login.
- Use HttpOnly, Secure, SameSite cookies with idle and absolute expiry.
- Add CSRF protection for cookie-authenticated mutations.
- Restrict CORS to the canonical frontend origin.
- Validate body, path, and query input at every mutation boundary.
- Enforce team ownership from the session, never from an authoritative client field.
- Use database transactions and unique constraints for registration and payment UTRs.
- Rate-limit login, registration, email, payment, and admin-sensitive actions separately.
- Do not log passwords, tokens, payment secrets, or unnecessary personal data.
- Keep exports and payment proofs outside the public web root.

This file describes the release gate. It is not a claim that the current legacy server already satisfies every control.
