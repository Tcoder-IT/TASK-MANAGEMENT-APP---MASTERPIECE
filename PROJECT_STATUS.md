# StudyFlow - Project Status Report

## 1. Evidence Summary

- **Git State**:
  - Branch: `feat/kanban-dnd`
  - Top Commit: `978dde5 fix(board): optimistic update, drag overlay, empty column drops and cap banner`
- **Test Results (Server)**:
  - Command: `npm test --prefix server`
  - Test Suites: Failed due to test setup helper mismatch (`TypeError: startTestMongo(...) is not a function` in tests invoking `startTestMongo()()`).
- **Build Result (Client)**:
  - Command: `npm run build --prefix client`
  - Output: `tsc && vite build` -> **PASSED successfully** in 6.91s (`dist/index.html`, `dist/manifest.webmanifest`, `dist/registerSW.js` generated).
- **Test Helpers Check**:
  - `Select-String` found direct `MongoMemoryServer.create()` in some test files, while helper `server\tests\helpers\mongo.js` defines `startTestMongo`.
- **Client Test Setup**:
  - `client/package.json` has `"test": "vitest run"`. No `*.test.tsx` files exist (NOT VERIFIED for unit tests).

---

## 2. Backend Inventory
1. **Env validation**: YES (`server/src/config/env.js`).
2. **Error handler**: YES (`server/src/middleware/errorHandler.js`).
3. **Security middleware**: YES (helmet, cors, sanitize, rate limiter).
4. **Auth system**: YES (Register, login, refresh rotation, logout, me, profile, password change/reset, delete).
5. **Token hashes**: YES (Refresh/reset tokens hashed; passwordHash omitted).
6. **Courses**: YES (CRUD, archive, ownership isolation).
7. **Tasks**: YES (CRUD, filters, search, sort, pagination, subtasks, bulk, move, board cap).
8. **Route order**: YES (`/tasks/board` and `/tasks/move` before `/:id`).
9. **Study groups / comments / activity log**: NO.
10. **Notifications & reminders**: PARTLY (`reminderScheduler.js` present).
11. **Web-push storage**: YES (`pushController.js`).
12. **Stats & sessions**: YES (`statsController.js`, `sessionController.js`).
13. **OpenAPI / Seed / CI / ESLint**: PARTLY (ESLint/Prettier present; OpenAPI, seed script, CI workflow missing).


---

## 3. Frontend Inventory
- **Pages**: Landing (YES), Login (YES), Register (YES), Dashboard (YES), Tasks (YES), Board (YES), Calendar (YES), Courses (YES), Timer (YES), Settings (YES), NotFound (YES).
- **UI Components**: `client/src/components/ui` (Button, Card, Input, Modal, Select, Drawer, Switch, Badge, Checkbox, Textarea, Label).
- **Auth**: Token storage, refresh rotation interceptor in Axios, AuthContext protected routes.
- **PWA / Dark Mode**: `vite-plugin-pwa` configured, dark mode via `ThemeContext.tsx`.

---

## 4. Bugs and Risks Found
1. `TypeError: startTestMongo(...) is not a function` error in server Jest tests due to double call syntax `startTestMongo()()`.
2. Password reset email logger instead of real provider (`authController.js`).
3. Missing OpenAPI docs, database seed script, and GitHub Actions CI workflow.

---

## 5. Recommended Build Order
1. **Phase 1: Backend Test Helper & Infra Fixes**
   - Fix `startTestMongo` double-call syntax in test suite.
   - Add database seed script and OpenAPI docs.
2. **Phase 2: CI/CD Pipeline**
   - Add `.github/workflows/ci.yml` for automated test/build checks.
3. **Phase 3: Extended Features**
   - Implement Study Groups and shared tasks (P6).
