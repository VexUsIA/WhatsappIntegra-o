# 🚂 Deploy no Railway - Guia Completo

## 📌 Sobre a Arquitetura

### Respondendo sua dúvida: "Será dois webs?"

**NÃO!** Será apenas **1 serviço web** que faz tudo:

```
┌─────────────────────────────────────────────────────┐
│         1 ÚNICO SERVIÇO (Railway)                   │
│                                                     │
│  ✅ Painel Web (http://seu-app.railway.app)        │
│     └─ Login das lojas                             │
│     └─ Dashboard                                   │
│     └─ QR Codes                                    │
│     └─ Gerenciar conexões                          │
│                                                     │
│  ✅ API REST (mesma URL)                           │
│     └─ /api/messages/send                          │
│     └─ /api/panel/*                                │
│     └─ /health                                     │
│                                                     │
│  ✅ Poller (background)                            │
│     └─ Monitora PostgreSQL a cada 2s               │
│                                                     │
│  ✅ Workers (background)                           │
│     └─ Processa fila Redis                         │
│     └─ Envia mensagens WhatsApp                    │
│                                                     │
│  ✅ SessionManager (background)                    │
│     └─ Mantém conexões WhatsApp ativas             │
└─────────────────────────────────────────────────────┘
```

### O Simulador ERP é APENAS para testes locais

- **Simulador** = Roda no seu PC (localhost)
- **Produção** = SCOM real insere na tabela PostgreSQL

---

## 🚀 Passo a Passo - Deploy no Railway

### 1. Criar Conta no Railway

1. Acesse: https://railway.app
2. Clique em "Login" → "Login with GitHub"
3. Autorize o Railway

### 2. Criar Novo Projeto

1. Clique em "New Project"
2. Escolha "Deploy from GitHub repo"
3. Selecione: `VexUsIA/WhatsappIntegra-o`
4. Clique em "Deploy Now"

### 3. Adicionar PostgreSQL

1. No projeto, clique em "+ New"
2. Escolha "Database" → "Add PostgreSQL"
3. Aguarde provisionar (~30 segundos)

### 4. Adicionar Redis

1. Clique em "+ New" novamente
2. Escolha "Database" → "Add Redis"
3. Aguarde provisionar

### 5. Configurar Variáveis de Ambiente

Clique no serviço principal (seu app) → "Variables" → "Raw Editor"

Cole isso (Railway preenche automaticamente as URLs dos bancos):

```env
# Serviço
NODE_ENV=production
PORT=3000

# JWT Secret (MUDE PARA ALGO ALEATÓRIO!)
JWT_SECRET=sua-string-super-secreta-aleatoria-aqui-12345

# PostgreSQL (Railway preenche automaticamente)
DATABASE_URL=${{Postgres.DATABASE_URL}}
SCOM_DB_HOST=${{Postgres.PGHOST}}
SCOM_DB_PORT=${{Postgres.PGPORT}}
SCOM_DB_NAME=${{Postgres.PGDATABASE}}
SCOM_DB_USER=${{Postgres.PGUSER}}
SCOM_DB_PASSWORD=${{Postgres.PGPASSWORD}}
SERVICE_DB_HOST=${{Postgres.PGHOST}}
SERVICE_DB_PORT=${{Postgres.PGPORT}}
SERVICE_DB_NAME=${{Postgres.PGDATABASE}}
SERVICE_DB_USER=${{Postgres.PGUSER}}
SERVICE_DB_PASSWORD=${{Postgres.PGPASSWORD}}

# Redis (Railway preenche automaticamente)
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

# Configurações
POLLING_INTERVAL_MS=2000
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_MS=5000
HEALTH_CHECK_INTERVAL_MS=30000
LOG_LEVEL=info
LOG_DIR=./logs
```

### 6. Fazer Build

1. Clique em "Settings" → "Build Command"
2. Adicione: `npm install && npm run build`
3. Clique em "Deploy" para redeployar

### 7. Aguardar Deploy

- Acompanhe os logs em "Deployments"
- Aguarde aparecer "Build successful"
- Aguarde aparecer "Deployment successful"

### 8. Obter URL do Serviço

1. Clique em "Settings" → "Networking"
2. Clique em "Generate Domain"
3. Copie a URL: `https://seu-app.up.railway.app`

---

## 🎯 Após Deploy - Configurar Banco

### 1. Acessar PostgreSQL

No Railway, clique no PostgreSQL → "Data" → "Query"

Ou use um cliente SQL com as credenciais do Railway.

### 2. Criar Loja

Execute no PostgreSQL do Railway:

```sql
-- Criar loja
INSERT INTO stores (id, store_code, store_name, email, password, is_active)
VALUES (
  'loja_001',
  'LOJA01',
  'Loja Matriz',
  'admin@loja01.com',
  '$2b$10$YourHashedPasswordHere',  -- Use bcrypt para gerar
  true
);

-- Criar conexão WhatsApp
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

**Para gerar senha hash:**

Execute localmente:
```bash
node -e "console.log(require('bcrypt').hashSync('senha123', 10))"
```

### 3. Acessar Painel

1. Acesse: `https://seu-app.up.railway.app`
2. Login:
   - Email: `admin@loja01.com`
   - Senha: `senha123`
3. Escaneie o QR Code com WhatsApp

---

## 🔗 Integrar com SCOM Real

### No SCOM (Delphi):

```sql
-- Criar tabela no banco do SCOM
CREATE TABLE whatsapp_queue (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  recipient VARCHAR(20) NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  message_text TEXT,
  file_path TEXT,
  file_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);
```

### Configurar Conexão:

No Railway, atualize as variáveis `SCOM_DB_*` para apontar para o banco do SCOM real:

```env
SCOM_DB_HOST=ip-do-servidor-scom
SCOM_DB_PORT=5432
SCOM_DB_NAME=banco_scom
SCOM_DB_USER=usuario_scom
SCOM_DB_PASSWORD=senha_scom
```

---

## 💰 Custos Railway

### Free Tier (Hobby Plan)
- **$5 de crédito grátis/mês**
- **500 horas de execução grátis**
- Suficiente para testes

### Custos Estimados (Produção)
- **Serviço Web**: ~$5-10/mês
- **PostgreSQL**: ~$5/mês
- **Redis**: ~$5/mês
- **Total**: ~$15-20/mês

---

## 📊 Monitoramento

### Logs
```
Railway → Seu Serviço → "Logs"
```

### Métricas
```
Railway → Seu Serviço → "Metrics"
```

### Health Check
```
https://seu-app.up.railway.app/health
```

---

## 🐛 Troubleshooting

### Build falha
- Verifique logs de build
- Certifique-se que `npm run build` funciona localmente

### Serviço não inicia
- Verifique variáveis de ambiente
- Veja logs: "Application crashed"

### Banco não conecta
- Verifique se PostgreSQL está provisionado
- Verifique variáveis `DATABASE_URL`

### Redis não conecta
- Verifique se Redis está provisionado
- Verifique variáveis `REDIS_*`

---

## ✅ Checklist Final

- [ ] Projeto no GitHub atualizado
- [ ] Railway conectado ao GitHub
- [ ] PostgreSQL adicionado
- [ ] Redis adicionado
- [ ] Variáveis de ambiente configuradas
- [ ] Build bem-sucedido
- [ ] Deploy bem-sucedido
- [ ] Loja criada no banco
- [ ] Conexão WhatsApp criada
- [ ] Painel web acessível
- [ ] QR Code aparece
- [ ] WhatsApp conectado
- [ ] Teste de envio funcionando

---

## 🎉 Pronto!

Seu serviço está rodando 24/7 no Railway!

**URL do Painel**: `https://seu-app.up.railway.app`

Qualquer dúvida, me avise! 🚀
