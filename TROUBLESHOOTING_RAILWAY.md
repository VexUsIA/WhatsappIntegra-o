# 🔧 Troubleshooting Railway Deploy

## Healthcheck Falhando

### 1. Verificar Logs no Railway

No Railway:
1. Clique no seu serviço
2. Vá em "Deployments"
3. Clique no deployment atual
4. Veja os logs

### 2. Problemas Comuns

#### A. Variáveis de Ambiente Faltando

Verifique se configurou:
- `DATABASE_URL` (do PostgreSQL)
- `REDIS_HOST`, `REDIS_PORT` (do Redis)
- `JWT_SECRET`

#### B. PostgreSQL não conecta

```bash
# No Railway, vá em PostgreSQL → Connect
# Copie as variáveis e adicione no serviço principal
```

#### C. Redis não conecta

```bash
# No Railway, vá em Redis → Connect
# Copie as variáveis
```

#### D. Porta incorreta

O Railway usa a variável `PORT` automaticamente.
Certifique-se que está usando `process.env.PORT` ou `3000`.

### 3. Testar Healthcheck Manualmente

Quando o serviço subir, teste:

```bash
curl https://seu-app.railway.app/health
```

Deve retornar:
```json
{"status":"ok","timestamp":"2024-..."}
```

### 4. Desabilitar Healthcheck Temporariamente

Se precisar debugar, edite `railway.toml`:

```toml
[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
# healthcheckPath = "/health"  # Comentar temporariamente
# healthcheckTimeout = 600
numReplicas = 1
```

### 5. Verificar se Prisma está Gerando

O erro pode ser que o Prisma Client não foi gerado.

No `package.json`, certifique-se que tem:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

### 6. Verificar Tabelas do Banco

O serviço pode estar falhando porque as tabelas não existem.

No Railway PostgreSQL → Query:

```sql
-- Verificar se tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Se não existir, execute as migrations:

```sql
-- Criar tabelas manualmente ou via Prisma Migrate
```

### 7. Logs Úteis

Procure por estes erros nos logs:

- `ECONNREFUSED` → Banco não conecta
- `Prisma Client not generated` → Falta gerar Prisma
- `Table does not exist` → Falta criar tabelas
- `ENOTFOUND` → DNS/host incorreto

### 8. Solução Rápida

Se nada funcionar, tente:

1. **Remover healthcheck temporariamente**
2. **Ver logs completos**
3. **Verificar variáveis de ambiente**
4. **Testar endpoint /health manualmente**

---

## Próximos Passos Após Deploy Funcionar

1. Criar tabelas no PostgreSQL
2. Criar primeira loja
3. Criar primeira conexão WhatsApp
4. Acessar painel e escanear QR Code

---

Me avise os logs que aparecem no Railway! 🚀
