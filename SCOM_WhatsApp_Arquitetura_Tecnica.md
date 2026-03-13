# Documento de Arquitetura Técnica
## Integração SCOM ERP ↔ WhatsApp
**Versão:** 1.0  
**Data:** Março de 2026  
**Classificação:** Confidencial — Uso Interno

---

## Sumário

1. [Visão Geral da Solução](#1-visão-geral-da-solução)
2. [Arquitetura Recomendada](#2-arquitetura-recomendada)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [Estrutura do Serviço Principal](#4-estrutura-do-serviço-principal)
5. [Comunicação com o ERP](#5-comunicação-com-o-erp)
6. [Monitoramento do PostgreSQL e API REST](#6-monitoramento-do-postgresql-e-api-rest)
7. [Fila de Mensagens](#7-fila-de-mensagens)
8. [Reconexão e Gerenciamento de Sessão WhatsApp](#8-reconexão-e-gerenciamento-de-sessão-whatsapp)
9. [Modelo de Banco de Dados](#9-modelo-de-banco-de-dados)
10. [Fluxo Completo ERP → Envio → Retorno de Status](#10-fluxo-completo-erp--envio--retorno-de-status)
11. [Estrutura de Projeto](#11-estrutura-de-projeto)
12. [Escalabilidade Multi-loja](#12-escalabilidade-multi-loja)
13. [Logs e Monitoramento](#13-logs-e-monitoramento)
14. [Critérios de Aceite por Fase](#14-critérios-de-aceite-por-fase)
15. [Considerações de Segurança](#15-considerações-de-segurança)

---

## 1. Visão Geral da Solução

### Problema atual

O executável atual que faz a ponte entre o SCOM e o WhatsApp apresenta os seguintes problemas críticos:

- Sessão do WhatsApp desconecta sem reconexão automática
- Ausência de fila: se o WhatsApp cair durante um envio, a mensagem é perdida
- Sem logs estruturados para diagnóstico
- Sem painel de monitoramento de status por lojista
- Manutenção difícil por ser um binário compilado

### Solução proposta

Substituir o executável por um **serviço Node.js** que:

- Mantém sessão WhatsApp persistida em banco de dados (QR Code apenas na primeira conexão)
- Expõe uma **API REST** para o SCOM chamar diretamente
- Monitora também uma tabela de fila no PostgreSQL (compatibilidade com o fluxo atual do SCOM)
- Usa **Redis** para enfileiramento robusto com retry automático
- Registra todos os eventos em logs estruturados
- Suporta múltiplos lojistas (multi-tenant) desde a fundação

### Princípio de compatibilidade

> O SCOM **não será modificado**. O novo serviço se adapta ao SCOM, não o contrário.

O serviço pode operar em dois modos de entrada simultaneamente:
- **Modo Polling:** monitora uma tabela `whatsapp_queue` no PostgreSQL do SCOM (igual ao comportamento atual)
- **Modo API:** recebe chamadas HTTP REST diretamente do SCOM (para versões futuras com pequena modificação no Delphi)

---

## 2. Arquitetura Recomendada

```
┌─────────────────────────────────────────────────────────┐
│                      SCOM ERP (Delphi)                  │
│                                                         │
│  ┌──────────────┐        ┌──────────────────────────┐   │
│  │   Módulo de  │──────▶ │  Tabela whatsapp_queue   │   │
│  │   Envio WPP  │  grava │  (PostgreSQL do SCOM)    │   │
│  └──────────────┘        └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                                  │
                           polling (2s)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────┐
│              SERVIÇO DE INTEGRAÇÃO (Node.js)            │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐  │
│  │  DB Poller  │───▶│  Fila Redis  │──▶│  Processor  │  │
│  │  (lê fila)  │    │  (enfileira) │   │  (workers)  │  │
│  └─────────────┘    └──────────────┘   └──────┬──────┘  │
│                                               │         │
│  ┌─────────────┐                      ┌───────▼───────┐  │
│  │  API REST   │───────────────────── │  Session Mgr  │  │
│  │  (opcional) │                      │  (por lojista)│  │
│  └─────────────┘                      └───────┬───────┘  │
│                                               │         │
│  ┌─────────────┐    ┌──────────────┐          │         │
│  │  Health     │    │  Logger      │          │         │
│  │  Monitor    │    │  (Winston)   │          │         │
│  └─────────────┘    └──────────────┘          │         │
└───────────────────────────────────────────────┼─────────┘
                                                │
                                                ▼
                                  ┌─────────────────────────┐
                                  │   Baileys (WhatsApp Web) │
                                  │   Sessão salva em        │
                                  │   PostgreSQL por lojista │
                                  └───────────┬─────────────┘
                                              │
                                              ▼
                                  ┌─────────────────────────┐
                                  │    WhatsApp (Meta)       │
                                  │    Número do lojista     │
                                  └─────────────────────────┘
```

---

## 3. Stack Tecnológica

### Backend (Serviço principal)

| Componente | Tecnologia | Justificativa |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Suporte nativo a I/O assíncrono, ideal para WebSockets e polling |
| Framework API | **Fastify** | Mais rápido que Express, validação nativa de schema |
| WhatsApp | **Baileys 6.x** | Biblioteca mais ativa do ecossistema, sem custo |
| Fila | **BullMQ + Redis** | Retry automático, prioridade, monitoramento visual |
| ORM | **Prisma** | Migrations, type safety, compatível com PostgreSQL |
| Logs | **Winston + Pino** | Logs estruturados em JSON, integração com ferramentas externas |
| Validação | **Zod** | Schema validation para payloads da API |
| Processo | **PM2** | Gerenciador de processos com restart automático |

### Infraestrutura (zero custo inicial)

| Componente | Tecnologia | Custo |
|---|---|---|
| Banco de dados do serviço | PostgreSQL 15 | Gratuito (mesmo servidor do SCOM) |
| Cache e filas | Redis 7 | Gratuito (Docker na mesma máquina) |
| Servidor | AWS EC2 t2.micro ou servidor local | Gratuito 12 meses (AWS Free Tier) |
| Monitoramento | Bull Board (dashboard Redis) | Gratuito |
| Painel de logs | Grafana + Loki | Gratuito (self-hosted) |

### Bibliotecas principais

```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.0",
    "fastify": "^4.28.0",
    "bullmq": "^5.12.0",
    "ioredis": "^5.3.2",
    "@prisma/client": "^5.14.0",
    "winston": "^3.13.0",
    "pino": "^9.3.2",
    "zod": "^3.23.0",
    "qrcode": "^1.5.3",
    "qrcode-terminal": "^0.12.0",
    "node-postgres": "^8.12.0",
    "dotenv": "^16.4.5",
    "p-queue": "^8.0.1"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "prisma": "^5.14.0",
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "vitest": "^1.6.0"
  }
}
```

---

## 4. Estrutura do Serviço Principal

### Componentes e responsabilidades

```
┌─────────────────────────────────────────────────────────┐
│                    Session Manager                       │
│                                                         │
│  • Uma instância Baileys por lojista                    │
│  • Serializa/deserializa auth state no PostgreSQL       │
│  • Expõe QR Code via WebSocket para o painel web        │
│  • Emite eventos: connected / disconnected / qr         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     DB Poller                           │
│                                                         │
│  • Roda a cada 2 segundos                               │
│  • Lê registros com status = 'pending' da tabela fila  │
│  • Marca como 'processing' atomicamente (SELECT FOR     │
│    UPDATE SKIP LOCKED — evita duplo processamento)      │
│  • Publica na fila BullMQ                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Message Processor                      │
│                                                         │
│  • Workers BullMQ (concorrência configurável)           │
│  • Tipos suportados: text, pdf, image                   │
│  • Retry: 3 tentativas com backoff exponencial          │
│  • Atualiza status no banco após cada tentativa         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Health Monitor                         │
│                                                         │
│  • Verifica sessão de cada lojista a cada 30s           │
│  • Tenta reconexão automática se desconectado           │
│  • Envia alerta por e-mail após 3 falhas consecutivas   │
│  • Expõe endpoint /health para monitoramento externo    │
└─────────────────────────────────────────────────────────┘
```

### Exemplo de código — Session Manager

```typescript
// src/whatsapp/SessionManager.ts
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { SessionRepository } from '../repositories/SessionRepository';
import { logger } from '../utils/logger';
import EventEmitter from 'events';

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, WASocket>();
  private reconnectAttempts = new Map<string, number>();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(private sessionRepo: SessionRepository) {
    super();
  }

  async createSession(tenantId: string): Promise<void> {
    logger.info({ tenantId }, 'Iniciando sessão WhatsApp');

    // Carrega ou cria auth state persistido no banco
    const { state, saveCreds } = await this.sessionRepo.getAuthState(tenantId);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: logger.child({ module: 'baileys', tenantId }),
      browser: ['SCOM ERP', 'Chrome', '126.0'],
    });

    // Persiste credenciais sempre que atualizadas
    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info({ tenantId }, 'QR Code gerado');
        this.emit('qr', { tenantId, qr });
      }

      if (connection === 'open') {
        logger.info({ tenantId }, 'WhatsApp conectado');
        this.reconnectAttempts.set(tenantId, 0);
        this.emit('connected', { tenantId });
        await this.sessionRepo.updateStatus(tenantId, 'connected');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.warn({ tenantId, statusCode }, 'Conexão encerrada');
        await this.sessionRepo.updateStatus(tenantId, 'disconnected');
        this.emit('disconnected', { tenantId, statusCode });

        if (shouldReconnect) {
          await this.scheduleReconnect(tenantId);
        } else {
          // Sessão revogada — remove auth state e pede novo QR
          await this.sessionRepo.clearAuthState(tenantId);
          logger.error({ tenantId }, 'Sessão revogada. QR Code necessário.');
          this.emit('session_revoked', { tenantId });
        }
      }
    });

    this.sessions.set(tenantId, socket);
  }

  private async scheduleReconnect(tenantId: string): Promise<void> {
    const attempts = (this.reconnectAttempts.get(tenantId) ?? 0) + 1;
    this.reconnectAttempts.set(tenantId, attempts);

    if (attempts > this.MAX_RECONNECT_ATTEMPTS) {
      logger.error({ tenantId, attempts }, 'Máximo de reconexões atingido');
      this.emit('max_reconnect_reached', { tenantId });
      return;
    }

    // Backoff exponencial: 2s, 4s, 8s, 16s, 32s
    const delay = Math.pow(2, attempts) * 1000;
    logger.info({ tenantId, attempts, delayMs: delay }, 'Agendando reconexão');

    setTimeout(() => this.createSession(tenantId), delay);
  }

  async sendMessage(tenantId: string, to: string, content: WAMessageContent): Promise<void> {
    const socket = this.sessions.get(tenantId);
    if (!socket) throw new Error(`Sessão não encontrada para lojista: ${tenantId}`);

    // Formata o número para o padrão JID do WhatsApp
    const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
    await socket.sendMessage(jid, content);
  }

  getStatus(tenantId: string): 'connected' | 'disconnected' | 'unknown' {
    const socket = this.sessions.get(tenantId);
    if (!socket) return 'unknown';
    return socket.user ? 'connected' : 'disconnected';
  }
}
```

---

## 5. Comunicação com o ERP

### Modo 1 — Polling no PostgreSQL (sem modificar o SCOM)

O serviço cria uma tabela `whatsapp_queue` no banco do SCOM e monitora novos registros:

```sql
-- Tabela criada pelo serviço de integração no banco do SCOM
CREATE TABLE whatsapp_queue (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     VARCHAR(50)   NOT NULL,
    recipient     VARCHAR(20)   NOT NULL,  -- número do cliente
    message_type  VARCHAR(20)   NOT NULL,  -- 'text', 'pdf', 'image'
    message_text  TEXT,
    file_path     TEXT,                    -- caminho do PDF no servidor
    file_name     VARCHAR(255),
    status        VARCHAR(20)   NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    processed_at  TIMESTAMP,
    error_message TEXT,
    retry_count   INTEGER       NOT NULL DEFAULT 0
);

CREATE INDEX idx_whatsapp_queue_status ON whatsapp_queue(status, created_at)
    WHERE status = 'pending';
```

O SCOM (Delphi) simplesmente faz um `INSERT` nessa tabela ao acionar o envio — nenhuma outra modificação necessária.

### Modo 2 — API REST (para integração futura)

```http
POST /api/v1/messages
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "tenantId": "loja_001",
  "recipient": "5511999887766",
  "type": "pdf",
  "fileName": "orcamento_1234.pdf",
  "fileBase64": "<base64 do PDF>",
  "caption": "Olá João! Segue seu orçamento. Qualquer dúvida, estamos à disposição."
}
```

Resposta:

```json
{
  "messageId": "msg_abc123",
  "status": "queued",
  "estimatedDelivery": "2026-03-12T14:32:00Z"
}
```

---

## 6. Monitoramento do PostgreSQL e API REST

### Polling robusto com SELECT FOR UPDATE SKIP LOCKED

```typescript
// src/poller/DbPoller.ts
import { PrismaClient } from '@prisma/client';
import { MessageQueue } from '../queue/MessageQueue';
import { logger } from '../utils/logger';

export class DbPoller {
  private running = false;
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaClient,
    private queue: MessageQueue,
    private pollIntervalMs = 2000
  ) {}

  start(): void {
    this.running = true;
    this.interval = setInterval(() => this.poll(), this.pollIntervalMs);
    logger.info('DB Poller iniciado');
  }

  stop(): void {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    logger.info('DB Poller encerrado');
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      // SELECT FOR UPDATE SKIP LOCKED evita que dois workers peguem o mesmo registro
      const pending = await this.prisma.$queryRaw<QueueItem[]>`
        SELECT * FROM whatsapp_queue
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      `;

      if (pending.length === 0) return;

      logger.debug({ count: pending.length }, 'Registros pendentes encontrados');

      // Marca como 'processing' atomicamente
      const ids = pending.map((r) => r.id);
      await this.prisma.$executeRaw`
        UPDATE whatsapp_queue SET status = 'processing' WHERE id = ANY(${ids}::bigint[])
      `;

      // Publica na fila Redis
      for (const item of pending) {
        await this.queue.enqueue(item);
      }
    } catch (error) {
      logger.error({ error }, 'Erro no DB Poller');
    }
  }
}
```

---

## 7. Fila de Mensagens

### Configuração BullMQ

```typescript
// src/queue/MessageQueue.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { SessionManager } from '../whatsapp/SessionManager';
import { logger } from '../utils/logger';

const connection = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null, // Obrigatório para BullMQ
});

export const messageQueue = new Queue('whatsapp-messages', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s
    removeOnComplete: { count: 1000 },             // Mantém últimos 1000 jobs concluídos
    removeOnFail: { count: 5000 },                 // Mantém últimos 5000 jobs com falha
  },
});

// Worker — processa mensagens da fila
export function createWorker(sessionManager: SessionManager): Worker {
  return new Worker(
    'whatsapp-messages',
    async (job) => {
      const { tenantId, recipient, messageType, messageText, filePath, fileName, queueId } = job.data;

      logger.info({ jobId: job.id, tenantId, recipient, messageType }, 'Processando mensagem');

      try {
        if (messageType === 'text') {
          await sessionManager.sendMessage(tenantId, recipient, { text: messageText });
        } else if (messageType === 'pdf') {
          const fileBuffer = await fs.promises.readFile(filePath);
          await sessionManager.sendMessage(tenantId, recipient, {
            document: fileBuffer,
            mimetype: 'application/pdf',
            fileName: fileName ?? 'documento.pdf',
            caption: messageText,
          });
        }

        // Atualiza status no banco para 'sent'
        await updateQueueStatus(queueId, 'sent');
        logger.info({ jobId: job.id, tenantId, recipient }, 'Mensagem enviada com sucesso');
      } catch (error) {
        logger.error({ jobId: job.id, error }, 'Erro ao enviar mensagem');
        await updateQueueStatus(queueId, 'error', String(error));
        throw error; // BullMQ captura e aplica retry
      }
    },
    {
      connection,
      concurrency: 5, // Até 5 envios simultâneos por instância
    }
  );
}
```

---

## 8. Reconexão e Gerenciamento de Sessão WhatsApp

### Persistência de sessão no PostgreSQL

```typescript
// src/repositories/SessionRepository.ts
import { PrismaClient } from '@prisma/client';
import { AuthenticationState, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

export class SessionRepository {
  constructor(private prisma: PrismaClient) {}

  async getAuthState(tenantId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const session = await this.prisma.whatsappSession.findUnique({
      where: { tenantId },
    });

    const creds = session?.authData
      ? JSON.parse(session.authData, BufferJSON.reviver)
      : initAuthCreds();

    const saveState = async (key: string, value: any) => {
      // Salva chaves individuais de autenticação
      await this.prisma.whatsappSessionKey.upsert({
        where: { tenantId_keyName: { tenantId, keyName: key } },
        update: { keyValue: JSON.stringify(value, BufferJSON.replacer) },
        create: {
          tenantId,
          keyName: key,
          keyValue: JSON.stringify(value, BufferJSON.replacer),
        },
      });
    };

    const saveCreds = async () => {
      await this.prisma.whatsappSession.upsert({
        where: { tenantId },
        update: { authData: JSON.stringify(creds, BufferJSON.replacer), updatedAt: new Date() },
        create: {
          tenantId,
          authData: JSON.stringify(creds, BufferJSON.replacer),
          status: 'pending_qr',
        },
      });
    };

    return {
      state: {
        creds,
        keys: {
          get: async (type, ids) => {
            const keys = await this.prisma.whatsappSessionKey.findMany({
              where: { tenantId, keyName: { in: ids.map((id) => `${type}-${id}`) } },
            });
            return Object.fromEntries(
              keys.map((k) => [k.keyName.replace(`${type}-`, ''), JSON.parse(k.keyValue, BufferJSON.reviver)])
            );
          },
          set: async (data) => {
            for (const [type, values] of Object.entries(data)) {
              for (const [id, value] of Object.entries(values as Record<string, any>)) {
                await saveState(`${type}-${id}`, value);
              }
            }
          },
          clear: async () => {
            await this.prisma.whatsappSessionKey.deleteMany({ where: { tenantId } });
          },
        },
      },
      saveCreds,
    };
  }

  async updateStatus(tenantId: string, status: string): Promise<void> {
    await this.prisma.whatsappSession.update({
      where: { tenantId },
      data: { status, updatedAt: new Date() },
    });
  }

  async clearAuthState(tenantId: string): Promise<void> {
    await this.prisma.whatsappSession.update({
      where: { tenantId },
      data: { authData: null, status: 'logged_out', updatedAt: new Date() },
    });
    await this.prisma.whatsappSessionKey.deleteMany({ where: { tenantId } });
  }
}
```

---

## 9. Modelo de Banco de Dados

### Schema Prisma completo

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Um registro por lojista/número de WhatsApp
model WhatsappSession {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  authData  String?  @db.Text   // JSON serializado das credenciais Baileys
  status    String   @default("pending_qr")
  // status: pending_qr | connected | disconnected | logged_out
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  keys     WhatsappSessionKey[]
  messages MessageLog[]

  @@map("whatsapp_sessions")
}

// Chaves de autenticação individuais (pre-keys, sender-keys, etc.)
model WhatsappSessionKey {
  id        String   @id @default(cuid())
  tenantId  String
  keyName   String
  keyValue  String   @db.Text
  updatedAt DateTime @updatedAt

  session WhatsappSession @relation(fields: [tenantId], references: [tenantId], onDelete: Cascade)

  @@unique([tenantId, keyName])
  @@map("whatsapp_session_keys")
}

// Log de todas as mensagens enviadas
model MessageLog {
  id           String    @id @default(cuid())
  tenantId     String
  recipient    String    // número do destinatário
  messageType  String    // text | pdf | image
  messageText  String?
  fileName     String?
  status       String    @default("queued")
  // status: queued | processing | sent | failed | cancelled
  errorMessage String?
  retryCount   Int       @default(0)
  queueJobId   String?   // ID do job BullMQ
  sentAt       DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  session WhatsappSession @relation(fields: [tenantId], references: [tenantId])

  @@index([tenantId, status])
  @@index([createdAt])
  @@map("message_logs")
}

// Tabela de fila no banco do SCOM (criada pelo serviço de integração)
// Nota: esta tabela fica no schema do banco do SCOM para compatibilidade
model WhatsappQueue {
  id           BigInt    @id @default(autoincrement())
  tenantId     String    @db.VarChar(50)
  recipient    String    @db.VarChar(20)
  messageType  String    @db.VarChar(20)
  messageText  String?
  filePath     String?
  fileName     String?   @db.VarChar(255)
  status       String    @default("pending") @db.VarChar(20)
  createdAt    DateTime  @default(now())
  processedAt  DateTime?
  errorMessage String?
  retryCount   Int       @default(0)

  @@index([status, createdAt])
  @@map("whatsapp_queue")
}
```

---

## 10. Fluxo Completo ERP → Envio → Retorno de Status

```
SCOM (Delphi)
    │
    │  1. Usuário clica "Enviar por WhatsApp" no SCOM
    │     SCOM faz INSERT na tabela whatsapp_queue
    │
    ▼
whatsapp_queue (PostgreSQL)
    status = 'pending'
    │
    │  2. DB Poller detecta (a cada 2s)
    │     SELECT FOR UPDATE SKIP LOCKED
    │     UPDATE status = 'processing'
    │
    ▼
BullMQ (Redis)
    │  Job enfileirado com dados da mensagem
    │
    │  3. Worker pega o job
    │     Verifica sessão do lojista (tenantId)
    │
    ▼
SessionManager
    │  4a. Sessão está conectada → prossegue
    │  4b. Sessão desconectada → aguarda reconexão
    │       → se falhar após retries → marca como 'failed'
    │
    ▼
Baileys → WhatsApp
    │  5. Envia mensagem (texto / PDF / imagem)
    │     Aguarda confirmação de entrega
    │
    ▼
MessageLog (PostgreSQL)
    │  6. Registra resultado:
    │     • status = 'sent' + sentAt = now()
    │     • ou status = 'failed' + errorMessage
    │
    ▼
whatsapp_queue (PostgreSQL)
    │  7. Atualiza registro original do SCOM:
    │     • status = 'sent' / 'failed'
    │     • processedAt = now()
    │
    ▼
SCOM (opcional — se implementar polling de retorno)
    8. SCOM pode consultar status via:
       SELECT status FROM whatsapp_queue WHERE id = :id
```

---

## 11. Estrutura de Projeto

```
scom-whatsapp-service/
│
├── src/
│   ├── config/
│   │   ├── database.ts          # Configuração Prisma + conexão
│   │   ├── redis.ts             # Configuração IORedis
│   │   └── env.ts               # Validação de variáveis de ambiente (Zod)
│   │
│   ├── whatsapp/
│   │   ├── SessionManager.ts    # Gerencia instâncias Baileys por lojista
│   │   ├── MessageSender.ts     # Abstração de envio (texto, PDF, imagem)
│   │   └── QrCodeEmitter.ts     # Emite QR via WebSocket para o painel
│   │
│   ├── queue/
│   │   ├── MessageQueue.ts      # Configuração BullMQ
│   │   ├── MessageWorker.ts     # Worker que processa os jobs
│   │   └── JobScheduler.ts      # Agendamento e retry
│   │
│   ├── poller/
│   │   └── DbPoller.ts          # Monitora tabela whatsapp_queue no PostgreSQL
│   │
│   ├── api/
│   │   ├── server.ts            # Fastify server
│   │   ├── routes/
│   │   │   ├── messages.ts      # POST /messages
│   │   │   ├── sessions.ts      # GET /sessions, POST /sessions/:id/connect
│   │   │   └── health.ts        # GET /health
│   │   └── middleware/
│   │       └── auth.ts          # Validação de API Key
│   │
│   ├── repositories/
│   │   ├── SessionRepository.ts # CRUD de sessões e auth state
│   │   ├── MessageRepository.ts # CRUD de logs de mensagens
│   │   └── QueueRepository.ts   # Acesso à tabela do SCOM
│   │
│   ├── monitor/
│   │   ├── HealthMonitor.ts     # Verifica saúde das sessões
│   │   └── AlertService.ts      # Envia alertas por e-mail
│   │
│   └── utils/
│       ├── logger.ts            # Configuração Winston
│       └── phoneFormatter.ts   # Normaliza números BR para JID
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docker/
│   ├── docker-compose.yml       # Redis + PostgreSQL para desenvolvimento
│   └── Dockerfile
│
├── .env.example
├── package.json
└── tsconfig.json
```

### Variáveis de ambiente (.env.example)

```env
# Banco de dados do serviço (pode ser o mesmo do SCOM)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/scom_wpp

# Banco do SCOM (para polling da tabela de fila)
SCOM_DATABASE_URL=postgresql://usuario:senha@localhost:5432/scom

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API
API_PORT=3001
API_KEY=chave_secreta_aqui

# Alertas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sistema@suaempresa.com.br
SMTP_PASS=senha_app
ALERT_EMAIL=ti@suaempresa.com.br

# Comportamento
POLL_INTERVAL_MS=2000
MAX_RECONNECT_ATTEMPTS=5
WORKER_CONCURRENCY=5
```

---

## 12. Escalabilidade Multi-loja

O sistema já é multi-tenant por design. Cada lojista é identificado por um `tenantId` único. Para suportar 500 lojistas:

### Distribuição de sessões

```typescript
// Todas as sessões são carregadas na inicialização
async function bootstrapSessions(sessionManager: SessionManager) {
  const sessions = await prisma.whatsappSession.findMany({
    where: { status: { in: ['connected', 'disconnected'] } },
  });

  for (const session of sessions) {
    await sessionManager.createSession(session.tenantId);
    // Pequeno delay para não sobrecarregar a Meta
    await sleep(500);
  }

  logger.info({ count: sessions.length }, 'Sessões inicializadas');
}
```

### Considerações para 500+ lojistas

- **Memória:** cada sessão Baileys usa ~15–30 MB de RAM → 500 sessões ≈ 8–15 GB. Recomenda-se distribuir em múltiplas instâncias com Redis compartilhado.
- **Separação de instâncias:** dividir lojistas por instância (ex: instância A cuida de IDs 1–250, instância B de 251–500) usando um campo `assigned_worker` na tabela de sessões.
- **Docker + PM2:** cada instância roda em seu próprio container com PM2 para restart automático.

---

## 13. Logs e Monitoramento

### Estrutura de log (JSON)

```json
{
  "level": "info",
  "timestamp": "2026-03-12T14:32:00.000Z",
  "tenantId": "loja_001",
  "messageId": "msg_abc123",
  "recipient": "5511999887766",
  "messageType": "pdf",
  "status": "sent",
  "durationMs": 842,
  "module": "MessageWorker"
}
```

### Dashboard Bull Board (Redis)

```typescript
// src/api/server.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

const serverAdapter = new FastifyAdapter();
createBullBoard({
  queues: [new BullMQAdapter(messageQueue)],
  serverAdapter,
});
serverAdapter.setBasePath('/admin/queues');
app.register(serverAdapter.registerPlugin());
// Acesse: http://localhost:3001/admin/queues
```

---

## 14. Critérios de Aceite por Fase

### Fase 1 — Infraestrutura base (Semanas 1–4)

- [ ] Serviço Node.js inicia sem erros
- [ ] Sessão WhatsApp de um lojista conecta via QR Code
- [ ] Após restart do serviço, sessão reconecta automaticamente (sem QR Code)
- [ ] Envio de mensagem de texto funciona end-to-end
- [ ] Logs estruturados aparecem no console e em arquivo

### Fase 2 — Integração com SCOM (Semanas 5–8)

- [ ] SCOM insere registro na tabela `whatsapp_queue`
- [ ] DB Poller detecta em até 3 segundos
- [ ] PDF é enviado corretamente pelo WhatsApp
- [ ] Status é atualizado na tabela após envio
- [ ] Falha de envio gera retry automático (3 tentativas)
- [ ] Falha permanente registra `error_message` no banco

### Fase 3 — Multi-tenant (Semanas 9–12)

- [ ] 10 lojistas conectados simultaneamente sem interferência
- [ ] Cada lojista só envia mensagens pelo seu próprio número
- [ ] Painel web mostra status de conexão por lojista
- [ ] QR Code exibido corretamente no painel para novos lojistas
- [ ] Health Monitor detecta queda e tenta reconexão

### Fase 4 — Produção (Semanas 13–16)

- [ ] 100 lojistas operando em produção por 7 dias sem incidentes críticos
- [ ] Dashboard Bull Board acessível para monitoramento
- [ ] Alertas de e-mail funcionando em caso de falha
- [ ] Tempo médio de envio < 5 segundos
- [ ] Taxa de sucesso de envio > 98%

---

## 15. Considerações de Segurança

| Item | Implementação |
|---|---|
| API Key | Hash bcrypt armazenado no banco, comparado a cada request |
| Auth State WhatsApp | Criptografado com AES-256 antes de salvar no banco |
| Comunicação interna | HTTPS com certificado Let's Encrypt (mesmo em ambiente local) |
| Acesso ao banco | Usuário PostgreSQL com permissões mínimas (apenas tabelas do serviço) |
| Logs | Nunca registrar conteúdo de mensagens, apenas metadados |
| PDFs | Validação de tipo MIME e tamanho máximo (25 MB, limite do WhatsApp) |
| Rate limiting | Máximo de 1 mensagem por segundo por lojista (evita ban da Meta) |

---

*Documento gerado para uso interno do projeto SCOM WhatsApp Integration.*  
*Versão 1.0 — Março de 2026*
