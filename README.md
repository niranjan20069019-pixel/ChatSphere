# ChatSphere

Modern real-time messaging platform inspired by WhatsApp, Telegram, Discord, and Slack — users connect via unique usernames instead of phone numbers.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT access tokens + refresh token rotation |
| Media | Cloudinary (with local fallback) |
| Calls | WebRTC + Socket.IO signaling |

## Features

- **Auth**: Register, login, logout, email verification, forgot/reset password, session management
- **Profiles**: Username, display name, avatar, bio, online status, privacy & theme settings
- **Friends**: Search, requests, accept/reject/cancel, remove, block/unblock, report
- **Messaging**: 1:1 chats, typing indicators, delivery/read receipts, reactions, reply, edit, delete, star, pin, archive, mute, search
- **Media**: Images, video, audio, voice notes, documents, PDF, ZIP, drag & drop
- **Groups**: Create/edit/delete, roles (owner/admin/member), group messaging
- **Calls**: Voice & video via WebRTC, mute/camera/screen share
- **Notifications**: In-app + browser notifications
- **Admin**: User management, reports, analytics, suspend/ban

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) **or** a local PostgreSQL instance
- npm 10+

### 1. Clone & install

```bash
cd ChatSphere
cp .env.example .env
npm install
```

### 2. Start PostgreSQL

**Option A — Docker:**

```bash
docker compose up -d postgres
```

**Option B — Local user-space Postgres** (no Docker/sudo):

```bash
npm run db:start
# Uses .pgdata on port 5433; update DATABASE_URL in .env accordingly:
# DATABASE_URL=postgresql://chatsphere@localhost:5433/chatsphere?host=/tmp&schema=public
```

**Option C — Existing PostgreSQL:** set `DATABASE_URL` in `.env` to your connection string.
### 3. Set up the database

```bash
cd apps/server
npx prisma generate
npx prisma db push
npm run db:seed
cd ../..
```

Or from the repo root after `db:start`:

```bash
npm run db:generate && npm run db:push && npm run db:seed
```

### 4. Run development servers

From the repo root:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:server   # API + Socket.IO on :4000
npm run dev:web      # Next.js on :3000
```

Open [http://localhost:3000](http://localhost:3000)

### Demo accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@chatsphere.app | Password123! |
| Demo | demo@chatsphere.app | Password123! |
| Alice | alice@chatsphere.app | Password123! |
| Bob | bob@chatsphere.app | Password123! |

## Project Structure

```
ChatSphere/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   └── src/
│   │       ├── app/         # Pages (App Router)
│   │       ├── components/  # UI, chat, layout, call
│   │       ├── lib/         # API client, socket, utils
│   │       ├── store/       # Zustand stores
│   │       └── types/
│   └── server/              # Express API
│       ├── prisma/          # Schema + seed
│       └── src/
│           ├── config/
│           ├── controllers/
│           ├── middleware/
│           ├── routes/
│           ├── sockets/     # Socket.IO
│           ├── utils/
│           └── validators/
├── docker-compose.yml
├── .env.example
└── package.json             # npm workspaces
```

## API Overview

Base URL: `http://localhost:4000/api`

| Prefix | Description |
|--------|-------------|
| `/auth` | Register, login, refresh, verify, password reset |
| `/users` | Profile, search, avatar, password |
| `/friends` | Friend graph, block, report |
| `/messages` | DMs, reactions, star/pin, chat settings |
| `/groups` | Groups & group messages |
| `/notifications` | Notification center |
| `/upload` | Secure file uploads |
| `/admin` | Admin/moderator tools |

Socket.IO connects to `http://localhost:4000` with `auth.token` = JWT access token.

## Environment Variables

See `.env.example` for the full list. Important ones:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — change in production
- `CLIENT_URL` — frontend origin for CORS/cookies
- `CLOUDINARY_*` — optional; without them, image/audio uploads use data URLs in dev
- `SMTP_*` — optional; without them, emails are logged to the server console

## Docker (full stack)

```bash
cp .env.example .env
# Edit secrets as needed
docker compose up --build -d
```

- Web: http://localhost:3000  
- API: http://localhost:4000 (health: `/api/health`)

`docker compose up` waits for PostgreSQL to be healthy, applies `prisma migrate deploy` automatically before the API boots, and runs each container as a non-root user with healthchecks.

To seed demo accounts against the compose Postgres:

```bash
npm run db:generate
DATABASE_URL=postgresql://chatsphere:chatsphere@localhost:5432/chatsphere?schema=public npm run db:seed
```

## Production Deployment

### Option A — Docker Compose (single host)

```bash
docker compose --env-file .env up --build -d
```

Set `NODE_ENV=production`, strong `JWT_*` secrets, and `COOKIE_SECURE=true` (HTTPS required) in `.env`.

### Option B — Render (blueprint included)

`render.yaml` provisions a PostgreSQL database plus a single web service that serves both the API and the exported Next.js frontend on one origin (cookies/CORS just work). After the first deploy:

1. The API runs `prisma migrate deploy` automatically on boot, so the first container start applies migrations against the production database.
2. If you deploy from the Render dashboard manually instead of using the blueprint, set `DATABASE_URL` in the service Environment to the Render database connection string.
3. Seed demo accounts: `DATABASE_URL=<production-db-url> npm run db:seed`.
4. Set `SMTP_*` and `CLOUDINARY_*` env vars to enable email and real media uploads.

If you want the frontend and API on separate origins instead, use two services and set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` at build time.

### Checklist for any platform

1. Strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` and `COOKIE_SECURE=true`.
2. `CLIENT_URL` / `FRONTEND_URL` point at the deployed web origin (CORS + cookies).
3. `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` point at the deployed API (baked in at build time).
4. Configure Cloudinary and SMTP for real media/email.
5. Run `prisma migrate deploy` before/at startup against the production database.
6. Put the API behind a reverse proxy with TLS and rate limiting.
7. Health check the API at `/api/health` and the web app at `/`.

## CI

`.github/workflows/ci.yml` runs lint + build for both apps on every push/PR.

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- Access JWT (~15m) + rotating refresh tokens in HTTP-only cookies
- Helmet, CORS, rate limiting, Zod validation
- Auth + role authorization middleware on protected routes
- File type and size limits on uploads

## License

MIT
