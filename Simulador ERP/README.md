# 🚀 Ambiente de Teste — SCOM WhatsApp Integration

Ambiente completo para desenvolver e testar a integração sem precisar do SCOM instalado.

---

## ✅ Pré-requisitos

Instale apenas estas duas ferramentas:

- **Docker Desktop** → https://www.docker.com/products/docker-desktop
- **Node.js 20 LTS** → https://nodejs.org (para rodar o serviço de integração)

---

## ▶️ Subindo o ambiente em 3 comandos

```bash
# 1. Entre na pasta docker
cd docker

# 2. Suba os containers (PostgreSQL + Redis + UIs)
docker-compose up -d

# 3. Verifique se está tudo rodando
docker-compose ps
```

Aguarde ~20 segundos para os containers iniciarem completamente.

---

## 🌐 Ferramentas disponíveis após subir

| Ferramenta | URL | Para quê |
|---|---|---|
| **Adminer** | http://localhost:8080 | Interface visual do PostgreSQL |
| **Redis Commander** | http://localhost:8081 | Visualizar filas Redis em tempo real |
| **Painel Simulador** | Abra `painel/index.html` no navegador | Simular o SCOM enviando mensagens |
| **Bull Board** | http://localhost:3001/admin/queues | Dashboard de jobs (após iniciar o serviço Node.js) |

### Conexão no Adminer

```
Sistema:  PostgreSQL
Servidor: localhost
Usuário:  scom_user
Senha:    scom_pass
Base:     scom_wpp
```

---

## 📋 Simulando o SCOM (sem precisar do ERP real)

### Opção A — Painel Web (mais fácil)

1. Abra o arquivo `painel/index.html` no navegador
2. Selecione o lojista
3. Escolha o tipo (texto, PDF ou imagem)
4. Informe o número e a mensagem
5. Clique em **Simular Envio do SCOM**
6. Veja o SQL gerado e o status em tempo real

### Opção B — SQL direto no Adminer

Acesse http://localhost:8080, conecte ao banco e use o arquivo `sql/02_simulador.sql`.

Exemplo rápido:
```sql
-- Simular o SCOM enviando uma mensagem de texto
INSERT INTO whatsapp_queue (tenant_id, recipient, message_type, message_text)
VALUES ('loja_001', '5511999887766', 'text', 'Olá! Seu orçamento foi aprovado.');

-- Verificar o status
SELECT id, tenant_id, recipient, status, created_at FROM whatsapp_queue ORDER BY created_at DESC;
```

---

## 🔧 Variáveis de ambiente para o serviço Node.js

Crie um arquivo `.env` na raiz do projeto de integração:

```env
# Banco do serviço (este ambiente de teste)
DATABASE_URL=postgresql://scom_user:scom_pass@localhost:5432/scom_wpp

# No ambiente real, aponta para o banco do SCOM
SCOM_DATABASE_URL=postgresql://scom_user:scom_pass@localhost:5432/scom_wpp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API
API_PORT=3001
API_KEY=dev_key_teste_123

# Polling
POLL_INTERVAL_MS=2000
MAX_RECONNECT_ATTEMPTS=5
WORKER_CONCURRENCY=3
```

---

## ⏹️ Parando o ambiente

```bash
# Para os containers (mantém os dados)
docker-compose stop

# Para e remove os containers (mantém os dados nos volumes)
docker-compose down

# Para, remove containers E apaga todos os dados
docker-compose down -v
```

---

## 🏗️ Estrutura dos arquivos

```
scom-test-env/
├── docker/
│   └── docker-compose.yml     ← Sobe PostgreSQL + Redis + UIs
├── sql/
│   ├── 01_init.sql            ← Cria as tabelas (executado automaticamente)
│   └── 02_simulador.sql       ← Comandos prontos para simular o SCOM
├── painel/
│   └── index.html             ← Painel web visual do simulador
└── README.md                  ← Este arquivo
```

---

## 🐛 Solução de problemas comuns

**Porta 5432 já em uso:**
```bash
# Altere a porta no docker-compose.yml:
ports:
  - "5433:5432"   # usa porta 5433 no host
# E atualize o DATABASE_URL para usar :5433
```

**Container não inicia:**
```bash
docker-compose logs postgres
docker-compose logs redis
```

**Resetar o banco completamente:**
```bash
docker-compose down -v
docker-compose up -d
```
