# Technology Stack — SCOM WhatsApp Integration Service

## Runtime & Language
- Node.js >= 20 LTS (required)
- TypeScript 5.5 — compiled to ES2022 / CommonJS (`tsc`)
- tsx 4.x — used for dev-mode execution (`npx tsx watch`) and scripts

## Key Dependencies

| Package | Version | Role |
|---|---|---|
| `@whiskeysockets/baileys` | ^7.0.0-rc.9 | WhatsApp Web protocol (session, QR, send) |
| `fastify` | ^4.28.0 | HTTP server (REST API + static panel) |
| `@fastify/static` | ^7.0.0 | Serve `src/public/` as static files |
| `bullmq` | ^5.12.0 | Redis-backed job queue + worker |
| `ioredis` | ^5.3.2 | Redis client (used by BullMQ) |
| `@prisma/client` | ^5.14.0 | ORM for PostgreSQL (service DB) |
| `pg` | ^8.12.0 | Raw PostgreSQL client (SCOM poller) |
| `jsonwebtoken` | ^9.0.2 | JWT auth for panel routes |
| `bcrypt` | ^5.1.1 | Password hashing for Store accounts |
| `winston` | ^3.13.0 | Structured logging with file rotation |
| `zod` | ^3.23.0 | Runtime schema validation (API inputs) |
| `qrcode` | ^1.5.3 | Generate QR Code data URL for panel |
| `dotenv` | ^16.4.5 | Load `.env` into `process.env` |
| `p-queue` | ^8.0.1 | Concurrency control within SessionManager |

## Infrastructure
- PostgreSQL 15+ — two logical databases:
  - Service DB (Prisma-managed): stores, connections, message logs
  - SCOM DB (polled via raw `pg`): `whatsapp_queue` table written by ERP
- Redis 7+ — BullMQ queue backend

## TypeScript Configuration
- `target`: ES2022, `module`: commonjs
- `strict`: true
- `rootDir`: `./src`, `outDir`: `./dist`
- Source maps + declaration files enabled
- `resolveJsonModule`: true

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | HTTP server port (default 3000) |
| `JWT_SECRET` | Secret for signing panel JWTs |
| `DATABASE_URL` | Prisma connection string (service DB) |
| `SCOM_DB_*` | Host/port/name/user/pass for SCOM DB |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection |
| `POLLING_INTERVAL_MS` | How often to poll SCOM queue (default 2000) |
| `MAX_RETRY_ATTEMPTS` | BullMQ job retry limit (default 3) |
| `RETRY_BACKOFF_MS` | Backoff delay between retries (default 5000) |
| `LOG_LEVEL` | Winston log level (default `info`) |
| `LOG_DIR` | Log file directory (default `./logs`) |

## NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `npx tsx watch src/index.ts` | Dev server with hot reload |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/index.js` | Run compiled production build |
| `prisma:generate` | `prisma generate` | Regenerate Prisma Client |
| `prisma:migrate` | `prisma migrate dev` | Run DB migrations |
| `prisma:studio` | `prisma studio` | Open Prisma Studio UI |
| `create:store` | `npx tsx scripts/createStore.ts` | Seed a test store |

## Container
- Base image: `node:20-alpine`
- System deps: git, python3, make, g++, cairo/jpeg/pango/giflib (for canvas/image support)
- Build: `npm install` → `prisma generate` → `tsc` → `npm prune --omit=dev`
- Exposed port: 3000

## Development Tools
- Adminer (port 8080) — PostgreSQL UI via Docker Compose (Simulador ERP)
- Redis Commander (port 8081) — Redis/queue UI via Docker Compose
- vitest ^1.6.0 — test runner (configured, tests not yet implemented)
