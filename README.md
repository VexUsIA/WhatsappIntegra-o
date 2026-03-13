# 🚀 SCOM WhatsApp Integration Service

Serviço Node.js para integração entre SCOM ERP e WhatsApp usando Baileys.

## ✨ Características

- ✅ **Sessão WhatsApp persistente** - QR Code apenas na primeira vez
- ✅ **Fila robusta** - BullMQ + Redis com retry automático
- ✅ **Multi-loja (multi-tenant)** - Cada loja com até 3 conexões
- ✅ **Painel web privado** - Cada loja acessa apenas seus dados
- ✅ **API REST** - Envio direto via HTTP
- ✅ **Polling PostgreSQL** - Compatível com SCOM atual
- ✅ **Logs estruturados** - Winston com rotação
- ✅ **Reconexão automática** - Mantém sessão sempre ativa
- ✅ **Simulador ERP** - Teste sem precisar do SCOM real

## 📋 Pré-requisitos

- **Node.js 20 LTS** - https://nodejs.org
- **Docker Desktop** - https://www.docker.com/products/docker-desktop
- **PostgreSQL 15+** (via Docker ou instalado)
- **Redis 7+** (via Docker ou instalado)

## 🎯 Quick Start (com Simulador)

### 1. Subir o Simulador ERP

```bash
cd "Simulador ERP/docker"
docker-compose up -d
```

Aguarde ~20 segundos. Isso sobe:
- PostgreSQL (porta 5432)
- Redis (porta 6379)
- Adminer - UI PostgreSQL (porta 8080)
- Redis Commander - UI Redis (porta 8081)

### 2. Configurar Ambiente

```bash
# Voltar para raiz do projeto
cd ../..

# Copiar configuração do simulador
cp .env.simulador .env

# Instalar dependências
npm install
```

### 3. Gerar Prisma Client

```bash
npm run prisma:generate
```

### 4. Criar Loja de Teste

```bash
npm run create:store
```

Isso cria:
- **ID**: `loja_001` (compatível com simulador)
- **Email**: `admin@loja01.com`
- **Senha**: `senha123`

### 5. Criar Conexão WhatsApp

Acesse Adminer: http://localhost:8080

Conecte com:
- Sistema: `PostgreSQL`
- Servidor: `localhost`
- Usuário: `scom_user`
- Senha: `scom_pass`
- Base: `scom_wpp`

Execute:

```sql
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
  '5511999999999',  -- Seu número aqui
  true
);
```

### 6. Iniciar o Serviço

```bash
npm run dev
```

### 7. Acessar Painel Web

Abra: http://localhost:3000

Login:
- Email: `admin@loja01.com`
- Senha: `senha123`

**Escaneie o QR Code** com seu WhatsApp!

### 8. Simular Envio do SCOM

Abra no navegador: `Simulador ERP/painel/index.html`

1. Selecione "Loja do João - Centro"
2. Informe seu número (com DDI+DDD)
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
  '5511999999999',  -- Seu número
  'text',
  'Olá! Teste de integração funcionando! 🚀'
);
```

**Você receberá a mensagem no WhatsApp!** 🎉

## 📁 Estrutura do Projeto

```
Projeto Whatsapp/
├── src/
│   ├── api/              # API REST + Painel Web
│   │   ├── server.ts     # Fastify + rotas públicas
│   │   ├── auth.ts       # JWT middleware
│   │   └── panelRoutes.ts # Rotas do painel (privadas)
│   ├── config/           # Configurações centralizadas
│   ├── database/         # Poller PostgreSQL (monitora SCOM)
│   ├── queue/            # BullMQ + Workers
│   ├── utils/            # Logger Winston
│   ├── whatsapp/         # SessionManager (Baileys)
│   ├── public/           # Painel web (HTML/CSS/JS)
│   └── index.ts          # Entry point
├── prisma/
│   └── schema.prisma     # Modelo de dados
├── scripts/
│   └── createStore.ts    # Criar lojas
├── Simulador ERP/        # Ambiente de teste completo
│   ├── docker/           # Docker Compose
│   ├── sql/              # Scripts SQL
│   └── painel/           # UI do simulador
├── logs/                 # Logs do serviço
├── .env                  # Variáveis de ambiente
└── package.json
```

## 🌐 Endpoints da API

### Painel Web (autenticado)

```http
POST   /api/panel/login                      # Login
GET    /api/panel/dashboard                  # Dashboard da loja
GET    /api/panel/connections                # Listar conexões
POST   /api/panel/connections                # Criar conexão
GET    /api/panel/connections/:id/status     # Status + QR Code
POST   /api/panel/connections/:id/disconnect # Desconectar
POST   /api/panel/connections/:id/reconnect  # Reconectar
GET    /api/panel/messages                   # Histórico
```

### API Pública

```http
GET    /health                               # Health check
POST   /api/messages/send                    # Enviar mensagem
GET    /api/messages/:id                     # Status da mensagem
```

## 🔧 Ferramentas de Monitoramento

| Ferramenta | URL | Descrição |
|------------|-----|-----------|
| **Painel Web** | http://localhost:3000 | Dashboard da loja |
| **Adminer** | http://localhost:8080 | UI PostgreSQL |
| **Redis Commander** | http://localhost:8081 | UI Redis (filas) |
| **Health Check** | http://localhost:3000/health | Status da API |

## 📚 Documentação Adicional

- [INSTALACAO_PAINEL.md](INSTALACAO_PAINEL.md) - Guia completo do painel web
- [INTEGRACAO_SIMULADOR.md](INTEGRACAO_SIMULADOR.md) - Detalhes do simulador
- [SCOM_WhatsApp_Arquitetura_Tecnica.md](SCOM_WhatsApp_Arquitetura_Tecnica.md) - Arquitetura completa

## 🏭 Deploy em Produção

### Com PM2

```bash
npm run build
pm2 start dist/index.js --name scom-whatsapp
pm2 save
pm2 startup
```

### Como Serviço Windows (NSSM)

```bash
nssm install SCOMWhatsApp "C:\Program Files\nodejs\node.exe"
nssm set SCOMWhatsApp AppDirectory "C:\caminho\do\projeto"
nssm set SCOMWhatsApp AppParameters "dist\index.js"
nssm start SCOMWhatsApp
```

## 🔐 Segurança

### Produção

1. **Mude JWT_SECRET** no `.env` para uma string aleatória forte
2. **Use HTTPS** - Configure Nginx ou similar
3. **Senhas fortes** - Mude as senhas padrão
4. **Firewall** - Exponha apenas portas necessárias
5. **Backup** - Configure backup automático do PostgreSQL

## 🐛 Troubleshooting

### Poller não detecta mensagens

```sql
-- Verificar se tenant_id corresponde ao store_id
SELECT id, store_code FROM stores;
SELECT tenant_id FROM whatsapp_queue WHERE status = 'pending';
```

### Conexão não inicializa

```sql
-- Verificar se existe conexão ativa
SELECT * FROM whatsapp_connections WHERE store_id = 'loja_001';
```

### Mensagem não envia

1. Verificar logs: `tail -f logs/combined.log`
2. Verificar status da conexão no painel
3. Verificar fila Redis: http://localhost:8081

### Resetar ambiente de teste

```bash
cd "Simulador ERP/docker"
docker-compose down -v
docker-compose up -d
```

## 📝 Tabela do SCOM Real

No ambiente de produção, crie esta tabela no banco do SCOM:

```sql
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

CREATE INDEX idx_whatsapp_queue_pending 
ON whatsapp_queue(status, created_at) 
WHERE status = 'pending';
```

## 🎯 Próximos Passos

- [ ] Implementar envio de PDF e imagens
- [ ] Adicionar Bull Board para monitoramento visual
- [ ] Implementar health check avançado
- [ ] Adicionar testes automatizados
- [ ] Configurar CI/CD
- [ ] Adicionar suporte a mensagens de template
- [ ] Implementar webhook para receber mensagens

## 📄 Licença

Uso interno - Confidencial

---

**Desenvolvido para integração SCOM ERP ↔ WhatsApp**
