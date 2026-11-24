# StudyFlow - Collaborative Task Manager for Students

A modern, full-stack task management application designed for students to organize study groups, manage group projects, track deadlines, and collaborate effectively.

## Features

- **Authentication**: Secure JWT-based authentication with access/refresh tokens, password reset
- **Task Management**: Create, organize, and track tasks with priorities, due dates, and courses
- **Courses**: Organize tasks by course with custom colors and codes
- **Study Sessions**: Pomodoro timer with session tracking and statistics
- **Real-time Notifications**: Web Push notifications for deadline reminders
- **Dashboard**: Visual progress tracking with charts and statistics
- **Collaborative**: Study groups and shared resources (planned)

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with access/refresh token rotation
- **Testing**: Jest + Supertest + MongoDB Memory Server
- **Security**: Helmet, CORS, Rate Limiting, Input Sanitization

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3
- **State Management**: TanStack Query + Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library
- **PWA**: Vite PWA Plugin

## Project Structure

```
studyflow/
├── server/                 # Backend (Express + MongoDB)
│   ├── src/
│   │   ├── config/         # Environment & DB config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth, error handling, rate limiting
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helpers & error classes
│   │   ├── validators/     # Zod schemas
│   │   ├── app.js          # Express app setup
│   │   └── server.js       # Entry point
│   ├── tests/              # Jest tests
│   └── package.json
│
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/            # Axios instance & endpoints
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-specific logic
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── package.json            # Root workspace config
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tcoder-IT/TASK-MANAGEMENT-APP---MASTERPIECE.git
   cd studyflow
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your MongoDB URI and secrets
   ```

4. **Run development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend: http://localhost:5050
   - Frontend: http://localhost:5173

### Environment Variables (server/.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5050` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_ACCESS_SECRET` | Access token secret (32+ chars) | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret (32+ chars) | Required |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:5173` |

### Running Tests

```bash
# All tests
npm run test

# Backend only
npm run test --workspace=server

# Frontend only
npm run test --workspace=client
```

### Seed Local Dashboard Demo Data

The dashboard seed creates an isolated `demo@studyflow.local` account with synthetic courses, tasks, and study sessions. It only permits the local MongoDB database named `studyflow`; it does not delete existing data. Set a private demo password before running it:

```powershell
$env:DEMO_SEED_PASSWORD = "choose-a-private-password"
npm run seed:dashboard --workspace=server
```

Sign in with `demo@studyflow.local` and the password you set. The seed can be run again safely to refresh its demo records.

### Building for Production

```bash
npm run build
```

## Roadmap

- [x] **P1** - Backend foundation (Express, MongoDB, env validation, health check)
- [x] **P2** - Auth system (JWT, register, login, refresh, logout, profile, password)
- [x] **P3** - Task & Course CRUD (tasks, courses, filtering, pagination)
- [x] **P4** - Stats, Sessions, Reminders (dashboard stats, Pomodoro, web push)
- [ ] **P5** - Frontend polish (UI/UX, accessibility, responsive)
- [ ] **P6** - Study Groups (create/join groups, shared tasks)
- [ ] **P7** - Real-time (WebSocket for live updates)
- [ ] **P8** - PWA & Mobile (offline support, installable)
- [ ] **P9** - Analytics & Reports (export, insights)

## License

MIT License - see LICENSE file for details.