# StudyFlow Project Status and Implementation Record

**Last reviewed:** 2026-11-24
**Branch:** `feature/studyflow-build`
**Latest pushed commit:** `5a2ce0c` — `Fix task creation form validation`
**Purpose:** Record the current implementation, work completed, verification, and the next work needed before a production deployment.

## Executive summary

StudyFlow is an existing full-stack study planner with a React/TypeScript client and an Express/MongoDB API. The core personal-planning workflow is implemented: account access, courses, tasks, calendar and board views, a Pomodoro timer, study-session tracking, dashboard statistics, and optional push reminders. Recent work connected the dashboard to the real API and fixed login, rate-limit, and task-form defects reported during local use.

This is **not yet a production deployment**. Production configuration, security decisions, end-to-end verification, CI reliability, and hosting have not been completed. Group collaboration, real-time features, and advanced analytics remain future scope.

## Product scope

StudyFlow is intended to help students organize study work by course, prioritize and complete tasks, plan around deadlines, and track study time. The SRS and initial requirement prompt are in [`docs/PROMPT.md`](docs/PROMPT.md); the feature checklist is [`docs/MATRIX.md`](docs/MATRIX.md).

## Implemented functionality

### Accounts and authentication

- Registration and login pages use the API's `{ success, data }` response envelope.
- Authenticated pages are protected; public auth pages redirect signed-in users to the dashboard.
- The API supports registration, login, refresh, logout, current-user lookup, profile changes, password changes, account deletion, and forgot/reset-password flows.
- Refresh tokens are stored hashed in MongoDB and sent to the browser as an HTTP-only cookie; refresh rotates the token.
- Client request handling refreshes expired access tokens and queues concurrent requests behind a refresh attempt.
- Login/register errors are surfaced to the form. Failed login/register requests are excluded from the automatic refresh path.
- Auth rate limiting uses an account-and-IP-derived key, alongside the global API rate limit, so attempts against one email do not consume the per-account allowance for a different email.
- Auth input normalization and related behavior have automated tests.

**Security decision still required:** the current client stores its access token in `localStorage`. The SRS calls for in-memory access-token storage. Review the trade-off and migrate or explicitly amend the SRS before production.

### Tasks and courses

- Courses can be created, listed, edited, and deleted. Tasks can be created, listed, edited, deleted, marked done/undone, searched, sorted, filtered, and paginated.
- A task includes a title, description, type, status, priority, required due date, optional course, tags, subtasks, order, archive state, and reminders.
- Task board endpoints support board retrieval and task moves/reordering.
- Dashboard links can initialize task filters through URL query parameters.
- Task creation now converts an empty “No Course” selection to `null`, which matches API validation. Submission errors remain visible in the task drawer rather than becoming uncaught promises.
- The course form uses `defaultValue` for fields read directly from the DOM, removing its React read-only-input warning.
- Focused client and server tests cover the task form and the no-course API payload.

### Dashboard and study data

- The dashboard loads summary statistics, upcoming tasks, course progress, study time, task-completion history, and task-status breakdowns from the API.
- It provides task actions and links into task views using the relevant filters.
- A local-only demo seed creates synthetic courses, tasks, and study sessions for `demo@studyflow.local`. It requires `DEMO_SEED_PASSWORD`, rejects non-loopback MongoDB hosts and databases other than `studyflow`, uses upserts, and does not perform broad deletes.

### Timer and sessions

- The timer has Pomodoro, Short Break, Long Break, and Deep Work presets.
- Work and break durations are configurable (work is clamped to 1–120 minutes; break to 1–60).
- Users may select a task and/or course to associate with a work session.
- Completing a work interval switches to break mode and logs a study session when a task or course is selected. The timer pauses at the interval boundary; the user starts the next interval manually.
- Session creation invalidates the relevant statistics/session queries and reports success or failure.

The previously reported Timer parsing defect is not present in the current branch: [Timer.tsx](client/src/pages/Timer.tsx) reads `tasksData?.data.data`, matching [Tasks.tsx](client/src/pages/Tasks.tsx), and the API returns the task array in `data` with pagination metadata alongside it. A focused regression test now verifies that this response populates the timer's selectable task list.

### Notifications and installability

- The API stores push subscriptions and has a scheduled reminder worker.
- Web Push requires VAPID configuration; without it reminders are disabled. Reminder settings and offsets are user-configurable.
- The client has a static web manifest, an SVG icon, and Vite PWA service-worker registration with auto-update.
- PWA installation/offline behavior and real browser push delivery still need production-like verification.

## Technical architecture

| Area | Current implementation |
|---|---|
| Client | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form/Zod, Axios, Recharts, Sonner |
| API | Node.js 20+, Express, ES modules, Zod request validation, centralized error handling |
| Database | MongoDB with Mongoose models for users, refresh tokens, courses, tasks, and study sessions |
| Auth | JWT access token plus rotating refresh token in an HTTP-only cookie |
| Security controls | Helmet, CORS allow-list, Mongo sanitization, body-size limit, global and auth-specific rate limits |
| Tests | Jest/Supertest and MongoDB Memory Server on the server; Vitest/Testing Library on the client |
| Local development | Root npm workspaces; Vite on port 5173 proxies `/api` to the server on port 5050 |

### Main API groups

All API paths are under `/api/v1`.

| Group | Implemented operations |
|---|---|
| `/health` | Health check |
| `/auth` | Registration, login, refresh, logout, profile, password, account, and password-reset operations |
| `/courses` | Authenticated course CRUD |
| `/tasks` | Authenticated task CRUD, list/filter, board, quick add, reorder, move, toggle |
| `/stats` | Summary, completed tasks per day, tasks by status |
| `/sessions` | Create/list study sessions |
| `/push` | Subscribe/unsubscribe push endpoints |

Successful API responses use a `{ success, data }` envelope. Task listing additionally returns a paginated payload containing task rows and metadata; consumers must account for that extra nesting.

## Work completed in the current feature branch

| Commit | Summary |
|---|---|
| `563bf6e` | Improved auth/client response handling, timer behavior, and PWA assets/configuration |
| `e5ca130` | Connected dashboard features to API data and added safe local dashboard demo seeding |
| `d8ee450` | Stabilized login and registration request handling; added client tests |
| `f720849` | Scoped auth throttling by account and IP; added rate-limit key tests |
| `5a2ce0c` | Fixed task creation course payload/error handling and course input warnings; added tests |

These commits are pushed to `origin/feature/studyflow-build`. No production deployment or pull request is recorded here.

## Verification recorded

- Client test suite: **8 files, 17 tests passed**, including the Timer task-selection regression test.
- Server test suite: **18 suites, 97 tests passed**.
- Client production build/type-check: **passed**; the build has emitted an existing large-bundle warning.
- Client lint: **0 errors, 4 warnings** (existing Fast Refresh and unused-variable warnings).
- Server lint: **0 errors, 5 warnings** (existing console logging warnings).
- `git diff --check`: passed before the task-form commit.

The full server suite, production-like browser testing, Lighthouse/accessibility checks, and deployed-environment tests have not been run as part of the latest task-form fix.

## Outstanding risks and next work

### Before production

1. Decide and implement the access-token storage approach consistent with the SRS.
2. Verify production CORS, cookie domain/Secure/SameSite settings, HTTPS, JWT secrets, MongoDB access controls, and request logging without exposing sensitive data.
3. Configure and test a real password-reset email provider. In development without SMTP, the email service falls back to logging reset-email details; do not rely on that behavior in production.
4. Fix and verify the [CI workflow](.github/workflows/ci.yml)'s configured `./studyflow` working directory against the actual repository root. The workflow currently runs tests, lint, and build; its “Deploy” job name does not implement a deployment step.
5. Test signup/login/refresh/logout, CRUD, task filtering, dashboard charts, timer session logging, push reminders, service-worker updates, and offline behavior in a real browser against a non-production environment.
6. Measure API performance and bundle size; address the build's large-bundle warning and run accessibility/Lighthouse checks.
7. Review deployment architecture, backups, monitoring, rate limits, email delivery, and database migration/retention strategy.

### Product features not implemented

- Study groups, shared tasks/resources, and collaboration permissions.
- Real-time updates/WebSockets.
- Advanced analytics, reports, and exports.

### Current workspace note

Three untracked scratch files were intentionally excluded from project commits: [Dashboard_backup.tsx](client/src/pages/Dashboard_backup.tsx), [temp_dashboard_gen.cjs](client/temp_dashboard_gen.cjs), and [write_dash.js.cjs](client/write_dash.js.cjs). Inspect them before deciding whether to keep or remove them; they are not documented as application source.

## Local development and demo data

1. Install Node.js 20+ and MongoDB. Configure `server/.env` using [server/.env.example](server/.env.example); do not commit `.env` or real credentials.
2. Install dependencies from the repository root with `npm install`.
3. Start both applications with `npm run dev`. The client is served at `http://localhost:5173`; the API is served at `http://localhost:5050`.
4. To populate only the local `studyflow` MongoDB database with demo data, set a private password and run the seed script from PowerShell:

   ```powershell
   $env:DEMO_SEED_PASSWORD = "choose-a-private-password"
   npm run seed:dashboard --workspace=server
   ```

5. Log in using `demo@studyflow.local` and the password supplied to the seed command.

Never point the demo seed at a hosted or production database. The script enforces the local-host/database restriction as a safeguard.

## Reference documents

- [SRS / initial requirements](docs/PROMPT.md)
- [Feature and gap matrix](docs/MATRIX.md)
- [Setup and command reference](README.md)
