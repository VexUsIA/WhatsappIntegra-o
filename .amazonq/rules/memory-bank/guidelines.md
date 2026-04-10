# Development Guidelines — SCOM WhatsApp Integration Service

## Code Quality Standards

### TypeScript
- `strict: true` is enforced — no implicit `any`, no unchecked nulls
- Use explicit type annotations on function parameters and return types
- Prefer `interface` for public API shapes (e.g., `JWTPayload`, `MessageJob`)
- Use `type` aliases for unions/enums (e.g., `messageType: 'text' | 'pdf' | 'image'`)
- Cast to `any` only when unavoidable (e.g., `(request as any).user = payload`)
- `error: any` is acceptable in catch blocks for `.message` access

### Naming Conventions
- Classes: PascalCase — `SessionManager`, `MessageProcessor`, `DatabasePoller`
- Files: camelCase for modules (`messageQueue.ts`), PascalCase for class files (`SessionManager.ts`)
- Variables/functions: camelCase — `storeId`, `recipientPhone`, `processMessage`
- Constants/config keys: camelCase nested objects — `config.redis.host`, `config.retry.maxAttempts`
- Database table names: snake_case via Prisma `@@map` — `stores`, `whatsapp_connections`, `message_logs`
- Prisma model fields: camelCase in schema, mapped to snake_case columns automatically

### File Structure Conventions
- One class per file for major components (SessionManager, MessageProcessor, DatabasePoller)
- Singleton exports for shared instances: `export const messageQueue = new Queue(...)`, `export const logger = ...`
- Config is a single exported plain object from `src/config/index.ts` — no class, no singleton pattern
- Scripts in `scripts/` are standalone executables with `.catch().finally()` at the bottom

---

## Architectural Patterns

### Configuration Pattern
All env vars are read once in `src/config/index.ts` with inline defaults:
```ts
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD || undefined,
  },
};
```
- Always import `config` from `../config` — never read `process.env` directly elsewhere
- Use `parseInt(..., 10)` for numeric env vars, never `Number()`

### Logging Pattern
Always import the singleton logger; never use `console.log` in `src/` (only in `scripts/`):
```ts
import { logger } from '../utils/logger';

logger.info('Descriptive message with context');
logger.error('Error description', errorObject);  // pass error as second arg
logger.warn('Warning with reason');
```
- Log at lifecycle boundaries: service start, connection events, job completion/failure
- Log messages in Portuguese (project convention)
- In production, only file transports are active; console transport is dev-only

### Dependency Injection Pattern
Classes receive `PrismaClient` and `SessionManager` via constructor — never instantiate them internally:
```ts
export class MessageProcessor {
  constructor(prisma: PrismaClient, sessionManager: SessionManager) {
    this.prisma = prisma;
    this.sessionManager = sessionManager;
  }
}
```
- `PrismaClient` is instantiated once in `src/index.ts` and passed down
- `SessionManager` is instantiated once in `src/index.ts` and passed to processor and server

### BullMQ Queue Pattern
Queue and Worker share the same `connectionOptions` object (defined locally in each file):
```ts
const connectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,  // required for BullMQ
};
```
- Queue is a singleton exported from `messageQueue.ts`; Worker lives inside `MessageProcessor` class
- Default job options: exponential backoff, `removeOnComplete: 100`, `removeOnFail: 500`
- Worker concurrency: 5
- Always attach `.on('completed')` and `.on('failed')` event handlers to both Queue events and Worker

### Error Handling Pattern
In BullMQ workers, always re-throw after updating DB state so BullMQ can retry:
```ts
} catch (error: any) {
  await this.prisma.messageLog.update({
    where: { id: messageLogId },
    data: { status: retryCount >= config.retry.maxAttempts ? 'failed' : 'pending', errorMessage: error.message },
  });
  throw error;  // re-throw so BullMQ handles retry
}
```
In API routes, catch and return structured error responses:
```ts
reply.status(400).send({ success: false, error: error.message });
```

### API Validation Pattern
Use Zod schemas defined at module level (not inline) for all POST body validation:
```ts
const sendMessageSchema = z.object({
  storeId: z.string().uuid(),
  recipientPhone: z.string().min(10),
  messageType: z.enum(['text', 'pdf', 'image']),
  content: z.string().optional(),
});

// In route handler:
const data = sendMessageSchema.parse(request.body);
```

### JWT Auth Pattern
Panel routes use a Fastify `preHandler` hook via `authMiddleware`:
```ts
// authMiddleware attaches decoded payload to request:
(request as any).user = payload;  // JWTPayload: { storeId, storeCode, email }

// In route handlers, extract storeId for tenant isolation:
const { storeId } = (request as any).user as JWTPayload;
```
- Token expiry: 7 days
- All `/api/panel/*` routes require the middleware; public routes do not

### Prisma Query Pattern
Always scope queries by `storeId` for tenant isolation:
```ts
await prisma.whatsAppConnection.findMany({
  where: { storeId, isActive: true },
});
```
- Use `include` for eager loading relations when needed in the same query
- Use `findUnique` for ID lookups, `findFirst` for conditional single-record lookups
- Always `await prisma.$disconnect()` in scripts' `finally` block

### Graceful Shutdown Pattern
Register both SIGINT and SIGTERM in `src/index.ts`:
```ts
const shutdown = async () => {
  await poller.stop();
  await messageProcessor.close();
  await server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```
Every major component must expose a `close()` or `stop()` async method.

---

## Frequently Used Idioms

- **Optional chaining for header check**: `authHeader?.startsWith('Bearer ')`
- **Nullish coalescing for defaults**: `process.env.X || 'default'`
- **Async readline prompt**: wrap `rl.question` in `new Promise<string>(resolve => ...)`
- **Switch on messageType**: use `switch` with explicit `default: throw new Error(...)` for exhaustive handling
- **Event-driven session updates**: emit `'qr'`, `'connected'`, `'disconnected'` from SessionManager; listen in `index.ts`

---

## What Is NOT Yet Implemented
- PDF and image message sending (`messageType: 'pdf' | 'image'` throws "not implemented")
- Automated tests (vitest is installed but no test files exist)
- Bull Board visual queue monitoring
- Webhook for receiving inbound WhatsApp messages
