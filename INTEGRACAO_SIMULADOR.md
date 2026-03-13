# 🔗 Integração com Simulador ERP

## Visão Geral

O Simulador ERP permite testar toda a integração sem precisar do SCOM real instalado.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│         Simulador ERP (Docker)                          │
│                                                         │
│  PostgreSQL (porta 5432)                                │
│  ├── Tabela: whatsapp_queue (simula SCOM)              │
│  ├── Tabela: whatsapp_sessions                         │
│  └── Tabela: message_logs                              │
│                                                         │
│  Redis (porta 6379)                                     │
│  └── Filas BullMQ                                       │
│                                                         │
│  Adminer (porta 8080) - UI PostgreSQL                   │
│  Redis Commander (porta 8081) - UI Redis                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│    Serviço de Integração (Node.js - porta 3000)        │
│                                                         │
│  1. Poller monitora whatsapp_queue a cada 2s           │
│  2. Enfileira no Redis (BullMQ)                         │
│  3. Worker processa e envia via Baileys                 │
│  4. Atualiza status em message_logs                     │
└─────────────────────────────────────────────────────────┘
```

## Passo a Passo

### 1. Subir o Simulador

```bash
cd "Simulador ERP/docker"
docker-compose up -d
```

Aguarde ~20 segundos para inicializar.

### 2. Configurar .env do Serviço

Crie `.env` na raiz do projeto principal:

```env
# Configurações do Serviço
NODE_ENV=development
PORT=3000

# JWT Secret
JWT_SECRET=dev-secret-change-in-production

# PostgreSQL do Simulador (SCOM simulado)
SCOM_DB_HOST=localhost
SCOM_DB_PORT=5432
SCOM_DB_NAME=scom_wpp
SCOM_DB_USER=scom_user
SCOM_DB_PASSWORD=scom_pass

# PostgreSQL do Serviço (mesmo banco do simulador)
SERVICE_DB_HOST=localhost
SERVICE_DB_PORT=5432
SERVICE_DB_NAME=scom_wpp
SERVICE_DB_USER=scom_user
SERVICE_DB_PASSWORD=scom_pass
DATABASE_URL="postgresql://scom_user:scom_pass@localhost:5432/scom_wpp?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Configurações
POLLING_INTERVAL_MS=2000
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_MS=5000
HEALTH_CHECK_INTERVAL_MS=30000

# Logs
LOG_LEVEL=info
LOG_DIR=./logs
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar Migrations

```bash
npm run prisma:generate
```

### 5. Criar Loja de Teste

Edite `scripts/createStore.ts` para usar `tenant_id` compatível:

```typescript
const store = await prisma.store.create({
  data: {
    id: 'loja_001', // Mesmo ID do simulador
    storeCode: 'LOJA01',
    storeName: 'Loja do João - Centro',
    email: 'admin@loja01.com',
    password: hashedPassword,
    isActive: true,
  },
});
```

Execute:
```bash
npm run create:store
```

### 6. Criar Conexão WhatsApp

Via SQL no Adminer (http://localhost:8080):

```sql
-- Conectar com: scom_user / scom_pass / scom_wpp

INSERT INTO whatsapp_connections (
  id, 
  store_id, 
  connection_name, 
  phone_number, 
  is_active
) VALUES (
  gen_random_uuid(),
  'loja_001',
  'Vendas',
  '5511999999999',
  true
);
```

### 7. Iniciar o Serviço

```bash
npm run dev
```

Você verá:
```
Iniciando serviço de integração SCOM-WhatsApp
Inicializando 1 conexões ativas
QR Code gerado para conexão <uuid>
API REST rodando na porta 3000
Painel web disponível em http://localhost:3000
```

### 8. Escanear QR Code

Acesse `http://localhost:3000` e faça login:
- Email: `admin@loja01.com`
- Senha: `senha123`

Escaneie o QR Code com WhatsApp.

### 9. Simular Envio do SCOM

Abra `Simulador ERP/painel/index.html` no navegador e:

1. Selecione "Loja do João - Centro"
2. Informe seu número (com DDI): `5511999999999`
3. Digite uma mensagem
4. Clique em "Simular Envio do SCOM"

Ou via SQL no Adminer:

```sql
INSERT INTO whatsapp_queue (
  tenant_id, 
  recipient, 
  message_type, 
  message_text
) VALUES (
  'loja_001',
  '5511999999999',
  'text',
  'Olá! Teste de integração funcionando!'
);
```

### 10. Monitorar

- **Logs do serviço**: `./logs/combined.log`
- **Painel web**: `http://localhost:3000`
- **Redis Commander**: `http://localhost:8081`
- **Adminer**: `http://localhost:8080`

## Fluxo Completo

1. **Simulador insere** na tabela `whatsapp_queue` (status: `pending`)
2. **Poller detecta** a cada 2 segundos
3. **Cria registro** em `message_logs` (status: `pending`)
4. **Enfileira no Redis** via BullMQ
5. **Worker processa** e envia via Baileys
6. **Atualiza status** para `sent` ou `failed`
7. **Marca no SCOM** como `processing` → `sent`

## Troubleshooting

### Poller não detecta mensagens

Verifique se o `tenant_id` na tabela `whatsapp_queue` corresponde ao `id` da loja:

```sql
SELECT id, store_code FROM stores;
SELECT tenant_id FROM whatsapp_queue;
```

### Conexão não inicializa

Verifique se existe uma conexão ativa:

```sql
SELECT * FROM whatsapp_connections WHERE store_id = 'loja_001';
```

### Mensagem não envia

1. Verifique se a conexão está `connected`:
```sql
SELECT status FROM whatsapp_connections WHERE store_id = 'loja_001';
```

2. Veja os logs:
```bash
tail -f logs/combined.log
```

3. Verifique a fila Redis:
```
http://localhost:8081
```

## Diferenças SCOM Real vs Simulador

| Campo | Simulador | SCOM Real |
|-------|-----------|-----------|
| ID da loja | `tenant_id` | `store_id` |
| Número | `recipient` | `recipient_phone` |
| Mensagem | `message_text` | `content` |
| Arquivo | `file_path` | `media_url` |

O poller foi ajustado para usar os nomes do simulador. No ambiente real, basta ajustar os nomes das colunas no `poller.ts`.

## Resetar Ambiente

```bash
cd "Simulador ERP/docker"
docker-compose down -v
docker-compose up -d
```

Depois recrie as lojas e conexões.
