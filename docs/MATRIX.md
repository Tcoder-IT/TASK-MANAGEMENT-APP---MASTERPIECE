# StudyFlow Feature and Gap Matrix

This matrix reflects the repository state reviewed on 2026-11-24. “Implemented” means the feature exists in the current codebase; it does not imply production deployment or production-like end-to-end verification. See [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) for implementation history, test evidence, and launch risks.

| Requirement ID | Description | Status |
|---|---|---|
| FR-A1 | Register with name, unique normalized email, and validated password | Implemented |
| FR-A2 | Login with generic invalid-credential response | Implemented |
| FR-A3 | Access JWT, rotating refresh token in HTTP-only cookie, client refresh flow | Implemented; access token is currently persisted in `localStorage`, differing from the SRS in-memory target |
| FR-A4 | Protected API and client routes | Implemented |
| FR-A5 | Read/update profile and change password | Implemented |
| FR-A6 | Delete own account | Implemented |
| FR-A7 | Forgot/reset password | Implemented; production email provider/configuration still required |
| FR-K1 | Course CRUD with name, code, color, and per-user ownership | Implemented |
| FR-B1–B10 | Task CRUD, filtering, search, sort, pagination, subtasks, board moves, archive, and quick add | Partial; core task CRUD/list/filter/board/quick-add APIs exist, but verify each SRS acceptance criterion and archive UX |
| FR-R1 | Configure task reminders | Implemented in task/user settings |
| FR-R2 | Deliver reminders with Web Push | Partial; scheduler and subscription endpoints exist, VAPID keys and real-browser delivery verification are required |
| FR-R3 | Email reminder fallback | Not implemented/verified |
| FR-D1 | Dashboard task statistics and upcoming work | Implemented |
| FR-D2 | Course progress and study-time visualizations | Implemented |
| FR-D3 | Task list/board views | Implemented |
| FR-D4 | Calendar view | Implemented |
| FR-D5 | Theme preferences | Implemented |
| FR-T1 | Pomodoro timer and configurable intervals | Implemented |
| FR-T2 | Study-session tracking and study streak | Partial; sessions are logged and surfaced, but streak behavior is not verified |
| FR-P1 | Web app manifest/installability | Implemented; verify install behavior on target browsers |
| FR-P2 | Offline shell/service-worker behavior | Partial; PWA service-worker configuration exists, offline behavior needs browser testing |
| FR-G1 | Study groups and shared resources | Planned |
| FR-RT1 | Real-time collaboration/updates | Planned |
| FR-AN1 | Analytics and exportable reports | Planned |
| NFR-Performance | List API under 300 ms and client bundle under 250 KB gzipped | Partial/not measured; the client build has emitted a large-bundle warning |
| NFR-Security | Secure secrets, auth, validation, ownership, and production configuration | Partial; baseline controls exist, but token storage and production configuration need review |
| NFR-Reliability | Health endpoint, centralized API errors, graceful server behavior | Implemented in the application; production monitoring/recovery is not verified |
| NFR-Testing | Automated backend/client coverage and acceptance tests | Partial; focused suites exist, but the latest full server suite, coverage thresholds, and end-to-end flows need verification |
| NFR-Lighthouse | Accessibility, PWA, and performance targets | Not measured |
| NFR-Deployment | Reproducible CI and production deployment | Not complete; inspect the CI working directory and add an actual deployment workflow |
