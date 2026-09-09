# Anvation

Anvation is the web platform for **KSSEM Anvation 1.0**, a national-level,
24-hour hackathon hosted by the K. S. School of Engineering & Management
(KSSEM), Bengaluru. The event information currently represented by the app is:

- **Dates:** 8-9 October 2026
- **Venue:** KSSEM Campus, Bengaluru
- **Team size:** 2-4 members (1 leader + 1-3 members)
- **Entry fee:** INR 500 per team
- **Prize pool:** INR 50,000
- **Theme:** explore, innovate, transform

This repository contains both the public event website and the private event
operations portal. It is a full-stack TypeScript application: a React frontend
is served by a Node.js/Express backend, with Vite used during development and
for the production frontend build.

## What the application does

### For visitors and participants

The public landing page presents the event, tracks, schedule, prizes, sponsors,
FAQs, contact information, and the rulebook. Visitors can:

1. View live registration statistics and the current set of enabled homepage
   sections.
2. Register a team and its participants.
3. Submit payment information and receive a registration confirmation.
4. Log in to the participant portal using team access details.
5. Submit a project and supporting links.
6. Submit milestone reports, book mentor slots, and raise support tickets when
   those features are enabled.
7. Read announcements, check submission status, and download certificates when
   they have been issued.

### For event administrators

The admin portal provides operational tools for the event team, including:

- Registration status, team and participant management, check-in, and food
  coupon claims.
- Payment UTR verification and registration freeze/unfreeze controls.
- Project submissions, judging scorecards, review feedback, score overrides,
  judging rounds, and emergency controls.
- Announcements, broadcast alerts, sponsors, schedule, policies, rulebooks,
  checkpoints, room allocations, and email campaigns.
- Milestone and support-ticket review.
- CMS settings for event details, feature flags, and homepage section
  visibility.
- Admin user management and audit logs.
- Certificate issuance.

Admin actions are protected by role-based access. `SUPER_ADMIN` is required for
destructive or highly privileged operations such as deleting teams, managing
admin users, overriding scores, clearing teams, and using emergency controls.

## Architecture

```text
Browser
  |
  | React UI and fetch('/api/...')
  v
server.ts (Express)
  |-- API routes and session authentication
  |-- file-backed data store
  |-- email, QR, PDF, certificate, and backup workflows
  |-- Vite middleware in development
  |-- dist/ static assets in production
```

The application uses client-side view state for its three main surfaces:

- `landing`: public event website
- `participant`: participant portal
- `admin`: administrator portal

There is no separate frontend router. `App.tsx` switches these surfaces and
opens the registration and rulebook modals globally.

## Repository layout

### Root files

| Path                | Purpose                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `index.html`        | Browser shell, metadata, fonts, and initial theme selection.                               |
| `package.json`      | Scripts and runtime/build dependencies.                                                    |
| `package-lock.json` | Locked npm dependency versions.                                                            |
| `server.ts`         | Express server, API routes, sessions, persistence, email, backups, and production serving. |
| `server-data.json`  | Runtime data store. It is created/updated by the server and should be backed up.           |
| `vite.config.ts`    | Vite, React, Tailwind, alias, and development-server configuration.                        |
| `tsconfig.json`     | TypeScript compiler settings and the `@/*` path alias.                                     |
| `start-prod.cmd`    | Windows production build-and-start helper.                                                 |
| `.env.example`      | Documented optional environment configuration.                                             |
| `backups/`          | CSV participant-registration backup output.                                                |
| `deployment/`       | Deployment-specific files and notes.                                                       |
| `dist/`             | Generated production frontend and bundled server output. Do not edit by hand.              |

### `src/`

| Path               | Purpose                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `App.tsx`          | Application shell, top-level view selection, homepage section flags, live stats, and global modals.                            |
| `main.tsx`         | React entry point.                                                                                                             |
| `index.css`        | Global styles, theme variables, utility styles, and visual effects.                                                            |
| `theme.tsx`        | Theme state and light/dark theme support.                                                                                      |
| `types.ts`         | Shared TypeScript domain models such as `Team`, `Participant`, `ProjectSubmission`, `JudgeScorecard`, and `WebsiteCMSConfig`.  |
| `vite-env.d.ts`    | Vite type declarations.                                                                                                        |
| `data/mockData.ts` | Seed content and event-facing data: college information, tracks, schedule, FAQs, sponsors, judges, mentors, and announcements. |

### `src/components/`

- `Navbar.tsx`: primary navigation, theme controls, portal navigation, and main calls to action.
- `Hero.tsx`: event headline, registration action, rulebook action, and live statistics.
- `AboutSection.tsx`: event and institution overview.
- `ThemesSection.tsx`: hackathon tracks and problem areas.
- `LiveSchedule24Hour.tsx`: 24-hour schedule display.
- `PrizesSection.tsx`: prize information.
- `SponsorsSection.tsx`: sponsor listing, including server-managed sponsors.
- `FAQSection.tsx`: frequently asked questions.
- `ContactSection.tsx`: contact details and support-ticket entry point.
- `RegistrationModal.tsx`: team registration, participant details, payment information, and confirmation flow.
- `RulebookModal.tsx`: rulebook viewing/download flow.
- `ParticipantPortal.tsx`: participant authentication and team workflow.
- `AdminPortal.tsx`: administrator dashboard and operational controls.
- `CheckInScanner.tsx`: QR/check-in workflow for event staff.
- `PhonePeQRCode.tsx`: payment QR presentation.
- `CyberAtmosphereBackground.tsx`: animated visual background.

### `src/utils/`

- `certificate.ts`: client-side certificate-related helpers.
- `pdfGenerator.ts`: PDF generation helpers.
- `qr.ts`: QR code helpers.

## Backend and data

`server.ts` is the authoritative application process. It owns the JSON data
file, so all registration, team, participant, submission, judging, and admin
mutations should go through the API rather than editing `server-data.json`
directly.

The server also maintains:

- A participant registration CSV backup under `backups/`.
- Optional Git-backed CSV synchronization when explicitly enabled.
- In-memory cookie sessions using the `anvation_session` cookie. Sessions last
  12 hours and are lost when the server process restarts.
- SMTP delivery for registration email. Without SMTP configuration, the server
  generates a downloadable `.eml` file instead of sending email.

The server applies compression, security headers, API rate limits, request
validation, same-origin checks for mutations, and role/team access checks. Put
production deployments behind HTTPS and a reverse proxy such as nginx or
Caddy.

## API groups

The API is implemented in `server.ts`; the most useful route groups are:

| Group                   | Examples                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Health and registration | `/api/health`, `/api/registration-status`, `/api/register`, `/api/verify-payment`                                 |
| Participant access      | `/api/participant-login`, `/api/submit-project`, `/api/milestone-reports`, `/api/mentor-bookings`, `/api/tickets` |
| Team operations         | `/api/teams`, `/api/checkin`, `/api/food-coupon/claim`, `/api/teams/:id/check-in`                                 |
| Judging                 | `/api/submissions`, `/api/scorecards`, `/api/judging-rounds`, `/api/submissions/override-score`                   |
| Content                 | `/api/announcements`, `/api/sponsors`, `/api/schedule`, `/api/rulebooks`, `/api/policies`, `/api/cms-config`      |
| Event operations        | `/api/checkpoints`, `/api/room-allocations`, `/api/finance/verify-utr`, `/api/certificate-issue`                  |
| Administration          | `/api/admin-login`, `/api/admin-users`, `/api/audit-logs`, `/api/emergency-control`                               |

Read endpoints are not all public. Always check the middleware attached to a
route before exposing it to a new frontend caller. Mutating requests should
preserve the existing authentication, role, team-ownership, and same-origin
requirements.

## Local development

### Prerequisites

- Node.js compatible with the installed TypeScript and Vite toolchain.
- npm.

### Start the development server

```bash
npm install
npm run dev
```

The combined server runs on `http://localhost:3001` by default. It serves the
React app through Vite middleware and exposes the API under `/api`. The Vite
configuration also defines port `5173` for direct Vite usage, but the normal
project workflow is `npm run dev`, which starts `server.ts` through `tsx`.

### Useful commands

```bash
npm run dev      # Start the full-stack development server
npm run build    # Build the frontend and bundle server.ts into dist/server.cjs
npm start        # Start the bundled production server
npm run lint     # Run TypeScript checking without emitting files
npm run clean    # Remove generated distribution output
```

After building, the production server listens on port `3001` by default. On
Windows, `start-prod.cmd` builds the project and starts it with production mode
and automatic cluster workers enabled.

## Environment configuration

Copy `.env.example` to `.env` when local configuration is needed. Never commit
real credentials.

### Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and
`MAIL_FROM` to send registration confirmation emails containing the gate-entry
QR information. Gmail requires an App Password, not the normal account
password. Without these values, use the generated `.eml` output for testing.

### Optional production settings

- `PORT`: public HTTP port; defaults to `3001`.
- `INTERNAL_PORT`: private authority port in cluster mode; defaults to `3002`.
- `CLUSTER_WORKERS`: number of workers or `auto` for CPU-based worker count.
- `GITHUB_BACKUP_SYNC`: explicitly enable CSV backup synchronization.
- `GITHUB_BACKUP_REPO_DIR`, `GITHUB_BACKUP_RELATIVE_PATH`,
  `GITHUB_BACKUP_REMOTE`, `GITHUB_BACKUP_BRANCH`,
  `GITHUB_BACKUP_AUTHOR_NAME`, and `GITHUB_BACKUP_AUTHOR_EMAIL`: backup sync
  settings.

Cluster mode keeps one authoritative process for data and API writes while
workers serve static content and proxy API requests. It is optional; the
default single-process mode is the simplest local setup.

## Typical workflows

### Registration

1. A visitor opens the landing page and starts registration.
2. The frontend checks registration availability.
3. The team and participant data is posted to `/api/register`.
4. Payment information can be verified by an administrator through the finance
   controls.
5. Confirmation email delivery is attempted when SMTP is configured.
6. Registration statistics update on the landing page.

### Participant work

1. The team leader uses the participant login.
2. The portal loads team data, announcements, checkpoints, submissions, tickets,
   feature flags, and certificate status.
3. The team submits its project and optional milestone reports.
4. The team can book a mentor and contact support when those features are on.

### Event operations

1. An administrator signs in through the admin portal.
2. Staff verify registrations and payments, then check teams in at the venue.
3. Administrators manage announcements, content, schedule, rooms, support, and
   judging data during the event.
4. Certificates can be issued after the appropriate event checks are complete.

## Development notes

- Keep shared request/response shapes aligned with `src/types.ts` and the
  corresponding server route.
- Prefer adding a focused API helper or component change over duplicating
  business logic in multiple portals.
- Treat `server-data.json` and participant backups as sensitive operational
  data. Do not add personal participant information to source files or logs.
- Update both seed data and CMS-backed behavior intentionally: seed data in
  `src/data/mockData.ts` is not the same thing as live persisted data.
- Run `npm run lint` after TypeScript changes and `npm run build` before a
  production deployment.
- Do not edit `dist/` manually; regenerate it with `npm run build`.

## Support and ownership

The event is associated with the KSSEM Department of Computer Science and
Engineering. Event contact information is defined in `src/data/mockData.ts`
and can also be managed through the CMS configuration exposed to administrators.
When changing contact or event information, verify both the public landing page
and the admin-configured values.
