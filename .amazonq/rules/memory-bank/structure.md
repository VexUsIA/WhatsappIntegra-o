# Project Structure — SCOM WhatsApp Integration Service

## Directory Layout

```
ProjetoWhatsapp/
├── src/
│   ├── index.ts              # Entry point — wires all subsystems, handles graceful shutdown
│   ├── api/
│   │   ├── server.ts         # Fastify server, public REST endpoints (/health, /api/messages/*)
│   │   ├── auth.ts           # JWT middleware for panel routes
│   │   └── panelRoutes.ts    # Private panel API (login, dashboard, connections, messages)
│   ├── config/
│   │   └── index.ts          # Centralised env-var config (dotenv + validation)
│   ├── database/
│   │   └── poller.ts         # PostgreSQL poller — monitors whatsapp_queue table from SCOM
│   ├── queue/
│   │   ├── messageQueue.ts   # BullMQ queue definition + Redis connection
│   │   └── messageProcessor.ts # BullMQ worker — processes jobs, calls SessionManager
│   ├── utils/
│   │   └── logger.ts         # Winston logger (console + rotating file transports)
│   ├── whatsapp/
│   │   └── SessionManager.ts # Baileys session lifecycle (init, QR, connect, reconnect, send)
│   └── public/
│       └── index.html        # Single-page web panel (vanilla HTML/CSS/JS)
├── prisma/
│   ├── schema.prisma         # Data models: Store, WhatsAppConnection, MessageLog
│   └── migrations/           # Prisma migration history
├── scripts/
│   └── createStore.ts        # CLI script to seed a test store + hashed password
├── .env / .env.example       # Environment variables
├── Dockerfile                # Container image definition
├── package.json
└── tsconfig.json
```

## Core Components

### Entry Point (`src/index.ts`)
Bootstraps the application in order:
1. Connect Prisma → PostgreSQL
2. Instantiate `SessionManager`, attach event listeners (qr, connected, disconnected)
3. Load all active `WhatsAppConnection` rows and call `sessionManager.initializeConnection()` for each
4. Start `MessageProcessor` (BullMQ worker)
5. Start `DatabasePoller`
6. Start Fastify HTTP server
7. Register SIGINT/SIGTERM handlers for graceful shutdown

### SessionManager (`src/whatsapp/SessionManager.ts`)
- Extends `EventEmitter`
- Manages a `Map<connectionId, BaileysSocket>` of active sessions
- Persists auth state as JSON in `WhatsAppConnection.authState` (Prisma)
- Emits: `qr`, `connected`, `disconnected`
- Public methods: `initializeConnection`, `sendMessage`, `disconnectConnection`, `reconnectConnection`

### MessageQueue + Processor (`src/queue/`)
- `messageQueue.ts` exports a singleton BullMQ `Queue` connected to Redis
- `messageProcessor.ts` creates a BullMQ `Worker` that dequeues jobs and calls `sessionManager.sendMessage()`
- Retry logic and backoff configured at queue level

### DatabasePoller (`src/database/poller.ts`)
- Polls `whatsapp_queue` table (SCOM's table) on a configurable interval
- Picks up `status = 'pending'` rows, creates `MessageLog` entries, enqueues BullMQ jobs
- Updates row `status` to `processing` to prevent double-processing

### API Layer (`src/api/`)
- `server.ts`: Fastify instance, serves static panel, registers panel routes, exposes public endpoints
- `panelRoutes.ts`: All `/api/panel/*` routes protected by JWT middleware from `auth.ts`
- Input validation via Zod schemas on all POST endpoints

## Data Models (Prisma)

| Model | Key Fields | Purpose |
|---|---|---|
| `Store` | `storeCode`, `email`, `password` (bcrypt) | Tenant — one per client store |
| `WhatsAppConnection` | `storeId`, `phoneNumber`, `authState`, `status`, `lastQrCode` | One Baileys session per row |
| `MessageLog` | `storeId`, `connectionId`, `status`, `retryCount` | Audit trail for every message |

## Architectural Patterns
- **Multi-tenant isolation**: all queries are scoped by `storeId` extracted from JWT
- **Event-driven session management**: SessionManager emits events; consumers react without tight coupling
- **Queue-based decoupling**: poller and API both enqueue to BullMQ; a single worker processes all jobs
- **Graceful shutdown**: poller, worker, server, and Prisma are all closed in sequence on SIGINT/SIGTERM
