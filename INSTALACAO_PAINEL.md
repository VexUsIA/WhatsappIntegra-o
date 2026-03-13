# 🚀 Guia de Instalação - Painel Web Multi-Tenant

## Visão Geral

O painel web permite que cada loja tenha acesso privado para:
- ✅ Gerenciar até 3 conexões WhatsApp por loja
- ✅ Ver QR Codes em tempo real
- ✅ Monitorar status das conexões
- ✅ Visualizar estatísticas de mensagens
- ✅ Histórico completo de envios

## Passo a Passo

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o `.env` e configure:
- Banco PostgreSQL do serviço
- Banco PostgreSQL do SCOM (para polling)
- Redis
- JWT_SECRET (use uma string aleatória forte)

### 3. Subir Redis (Docker)

```bash
docker run -d --name redis-whatsapp -p 6379:6379 redis:7-alpine
```

### 4. Executar Migrations do Prisma

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 5. Criar Primeira Loja

```bash
npm run create:store
```

Isso criará:
- Email: `admin@loja01.com`
- Senha: `senha123`
- Código: `LOJA01`

### 6. Iniciar o Serviço

```bash
npm run dev
```

### 7. Acessar o Painel

Abra o navegador em: `http://localhost:3000`

Faça login com:
- Email: `admin@loja01.com`
- Senha: `senha123`

## Como Usar o Painel

### Adicionar Nova Conexão WhatsApp

1. Clique em "+ Nova Conexão"
2. Preencha:
   - Nome: Ex: "Vendas", "Suporte", "SAC"
   - Número: Ex: "5511999999999"
3. Clique em "Criar Conexão"
4. O QR Code aparecerá automaticamente
5. Escaneie com o WhatsApp do celular
6. Aguarde a conexão (status mudará para "Conectado")

### Gerenciar Conexões

- **Desconectar**: Remove a sessão do WhatsApp
- **Reconectar**: Gera novo QR Code para reconectar

### Estatísticas

O dashboard mostra em tempo real:
- Conexões ativas
- Mensagens enviadas
- Mensagens pendentes
- Mensagens com falha

## Criar Mais Lojas

Para criar lojas adicionais, edite `scripts/createStore.ts` e execute:

```bash
npm run create:store
```

Ou crie manualmente no banco:

```sql
INSERT INTO stores (id, store_code, store_name, email, password, is_active)
VALUES (
  gen_random_uuid(),
  'LOJA02',
  'Loja Filial',
  'admin@loja02.com',
  '$2b$10$...',  -- Use bcrypt para gerar o hash
  true
);
```

## Segurança

### Produção

1. **Mude o JWT_SECRET** no `.env`
2. **Use HTTPS** (configure um proxy reverso como Nginx)
3. **Senhas fortes** para cada loja
4. **Firewall** - Exponha apenas a porta 3000

### Exemplo Nginx

```nginx
server {
    listen 443 ssl;
    server_name whatsapp.suaempresa.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Deploy em Produção

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

## Tabela do SCOM

Para o polling funcionar, crie no banco do SCOM:

```sql
CREATE TABLE whatsapp_queue (
  id SERIAL PRIMARY KEY,
  store_id VARCHAR(36) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(10) NOT NULL,
  content TEXT,
  media_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

O `store_id` deve corresponder ao UUID da loja no banco do serviço.

## Troubleshooting

### QR Code não aparece
- Verifique os logs: `./logs/combined.log`
- Certifique-se que a conexão está ativa

### Erro de autenticação
- Verifique se o JWT_SECRET está configurado
- Limpe o localStorage do navegador

### Mensagens não enviam
- Verifique se o Redis está rodando
- Verifique se a conexão WhatsApp está conectada
- Veja os logs de erro: `./logs/error.log`

## Suporte

Para dúvidas ou problemas, verifique:
- Logs do serviço: `./logs/`
- Console do navegador (F12)
- Status do Redis: `redis-cli ping`
- Status do PostgreSQL: `psql -U user -d database -c "SELECT 1"`
