# StudyFlow Feature and Gap Matrix

| Requirement ID | Description | Status |
|---|---|---|
| FR-A1 | Register (name, email unique lowercase, password min 8) | ✅ Done (P2) |
| FR-A2 | Login with generic error | ✅ Done (P2) |
| FR-A3 | Access JWT + refresh cookie, silent refresh | ✅ Done (P2) |
| FR-A4 | Protected routes on API & client | ✅ Done (P2) |
| FR-A5 | GET/PATCH /users/me, change password | ✅ Done (P2) |
| FR-A6 | Delete own account | ✅ Done (P2) |
| FR-A7 | Forgot/reset password | Missing (P2 - C priority) |
| FR-K1 | CRUD courses (name, code, color, unique per user) | ✅ Done (P3) |
| FR-B1 - B10 | Task CRUD, filters, search, sort, pagination, subtasks, dnd, archive, quick add | ✅ Done (P3) |
| FR-R1 - R3 | Per-task reminders, Web Push cron, email fallback | ✅ Done (P4) |
| FR-D1 - D5 | Dashboard stats, progress ring, list/board view, calendar, themes | Partial (P4-P5) |
| FR-T1 - T2 | Pomodoro timer, study sessions, streak | ✅ Done (P4) |
| FR-P1 - P2 | PWA manifest, installable, offline shell | Missing (P8) |
| NFR-Performance | List API < 300ms, JS bundle < 250KB gzipped | Partial (P1) |
| NFR-Security | OWASP top 10 review, env secrets, no logs | ✅ Done (P1-P4) |
| NFR-Reliability | Central error handler, graceful shutdown | ✅ Done (P1) |
| NFR-Testing | 70%+ coverage on auth/tasks, RTL tests | ✅ Done (P2-P4) |
| NFR-Lighthouse | Accessibility 90+, PWA, Perf 85+ | Missing (P8-P9) |
