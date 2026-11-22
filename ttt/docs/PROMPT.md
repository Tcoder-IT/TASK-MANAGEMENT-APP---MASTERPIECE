# StudyFlow - Task and Study Planner for Students

ROLE
You are a Principal MERN Engineer, UI/UX Engineer, and Application Security Reviewer. Build and harden "StudyFlow" in the current workspace. Quality target: a professional product, not a demo.

PROJECT SUMMARY
StudyFlow is a mobile-first task and study planner for university students. Students register, sign in, and manage tasks grouped by course (assignments, exams, projects, labs, personal), with priorities, due dates, subtasks, reminders, a weekly/calendar view, a Kanban board, a dashboard with progress, and a Pomodoro study timer. It is a responsive website that is installable as a PWA.

HOW TO WORK
1. Work in small phases. After each phase, STOP, report, and wait for me to reply "continue".
2. Inspect before editing: list directories, read package.json files, and read only the files you need. Never assume a path exists.
3. If code already exists, preserve working features and extend them. If the folder is empty, scaffold the structure.
4. Make small, focused edits. Do not rewrite whole files unless necessary.
5. After each phase run lint, tests, and build where they exist and show the real output. Never claim success without evidence. Report failures honestly.

SAFETY RULES
- Never read, print, edit, or commit .env files, tokens, or secrets. Only create and edit .env.example with placeholders.
- Never run destructive DB operations (dropDatabase, unfiltered deleteMany/deleteOne). Never connect to production. Tests must use mongodb-memory-server.
- Never run git push, git reset --hard, git clean -fd, or force commands.
- On the first phase create the branch feature/studyflow-build and commit after every phase with a clear message.

FIXED TECH STACK
- Backend: Node.js 20 LTS, Express, Mongoose, MongoDB.
- Auth: access JWT (15 min) kept in client memory, plus refresh token (7 days) in httpOnly, Secure, SameSite cookie with rotation. Passwords hashed with bcrypt (cost 12).
- Validation: Zod on every body, query, and params.
- Security: helmet, cors with an allow-list from env, express-rate-limit, express-mongo-sanitize, 10kb body limit.
- Frontend: React 18 + Vite, React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS, lucide-react, sonner, dnd-kit, date-fns, Axios, Recharts, vite-plugin-pwa.
- Testing: Jest + Supertest + mongodb-memory-server (server); Vitest + React Testing Library (client).


PHASES & REQUIREMENTS SUMMARY
- P0: Audit or scaffold (Feature/Gap Matrix, scaffold directories).
- P1: Backend foundation (env validation, DB connection, security, error handler, health route).
- P2: Auth (User & RefreshToken models, JWT rotation, auth endpoints, tests).
- P3: Courses and tasks (models, CRUD, filters, search, sort, pagination, ownership tests).
- P4: Stats, sessions, reminders (stats, study sessions, cron/reminders, push).
- P5: Frontend foundation (Tailwind, theme, layout, router, Axios client with refresh).
- P6: Task features (courses UI, task list, drawer form, filters, search, pagination, subtasks, undo, quick add).
- P7: Dashboard, board, calendar, timer (stats, charts, Kanban dnd, calendar view, Pomodoro).
- P8: Polish and PWA (skeletons, empty states, toasts, accessibility, PWA manifest & SW).
- P9: Verification and docs (lint, tests, build, README, final report).
