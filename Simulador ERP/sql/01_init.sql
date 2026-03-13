-- ============================================================
--  SCOM WhatsApp Integration — Ambiente de Teste
--  Script de inicialização do banco de dados
--  Executado automaticamente pelo Docker na primeira inicialização
-- ============================================================

-- ─── Tabelas do SERVIÇO DE INTEGRAÇÃO ───────────────────────────

-- Sessões WhatsApp por lojista
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id          SERIAL PRIMARY KEY,
    tenant_id   VARCHAR(50)  NOT NULL UNIQUE,
    tenant_name VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    auth_data   TEXT,                        -- JSON serializado das credenciais Baileys
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending_qr',
    -- status: pending_qr | connected | disconnected | logged_out
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Chaves individuais de autenticação do Baileys (pre-keys, sender-keys etc.)
CREATE TABLE IF NOT EXISTS whatsapp_session_keys (
    id          SERIAL PRIMARY KEY,
    tenant_id   VARCHAR(50)  NOT NULL,
    key_name    VARCHAR(200) NOT NULL,
    key_value   TEXT         NOT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, key_name),
    FOREIGN KEY (tenant_id) REFERENCES whatsapp_sessions(tenant_id) ON DELETE CASCADE
);

-- Log completo de mensagens enviadas
CREATE TABLE IF NOT EXISTS message_logs (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     VARCHAR(50)  NOT NULL,
    recipient     VARCHAR(20)  NOT NULL,
    message_type  VARCHAR(20)  NOT NULL,     -- text | pdf | image
    message_text  TEXT,
    file_name     VARCHAR(255),
    status        VARCHAR(20)  NOT NULL DEFAULT 'queued',
    -- status: queued | processing | sent | failed | cancelled
    error_message TEXT,
    retry_count   INTEGER      NOT NULL DEFAULT 0,
    queue_job_id  VARCHAR(100),
    sent_at       TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_tenant_status
    ON message_logs(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_message_logs_created
    ON message_logs(created_at DESC);


-- ─── Tabela que SIMULA o banco do SCOM ──────────────────────────
--     No ambiente real, esta tabela fica no banco do SCOM (Delphi)
--     O serviço de integração monitora ela via polling

CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     VARCHAR(50)  NOT NULL,
    recipient     VARCHAR(20)  NOT NULL,     -- número do cliente (só dígitos)
    message_type  VARCHAR(20)  NOT NULL,     -- text | pdf | image
    message_text  TEXT,
    file_path     TEXT,                      -- caminho do arquivo no servidor
    file_name     VARCHAR(255),
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
    -- status: pending | processing | sent | failed
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    processed_at  TIMESTAMP,
    error_message TEXT,
    retry_count   INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_pending
    ON whatsapp_queue(status, created_at)
    WHERE status = 'pending';


-- ─── Lojistas de TESTE pré-cadastrados ──────────────────────────

INSERT INTO whatsapp_sessions (tenant_id, tenant_name, status) VALUES
    ('loja_001', 'Loja do João - Centro',     'pending_qr'),
    ('loja_002', 'Mercadinho da Maria',        'pending_qr'),
    ('loja_003', 'Eletrônicos Silva & Cia',    'pending_qr')
ON CONFLICT (tenant_id) DO NOTHING;


-- ============================================================
--  SIMULADOR DO SCOM
--  Use os comandos abaixo para simular envios do ERP
--  Cole no Adminer, DBeaver, psql ou qualquer cliente SQL
-- ============================================================

-- ── EXEMPLO 1: Enviar mensagem de texto ─────────────────────────
/*
INSERT INTO whatsapp_queue (tenant_id, recipient, message_type, message_text)
VALUES (
    'loja_001',                          -- tenant_id do lojista
    '5511999887766',                     -- número do cliente (com DDI+DDD)
    'text',
    'Olá! Seu orçamento foi aprovado. Pode passar na loja para retirar. Obrigado!'
);
*/

-- ── EXEMPLO 2: Enviar PDF ────────────────────────────────────────
/*
INSERT INTO whatsapp_queue (tenant_id, recipient, message_type, message_text, file_path, file_name)
VALUES (
    'loja_001',
    '5511999887766',
    'pdf',
    'Segue seu orçamento em anexo. Qualquer dúvida estamos à disposição!',
    '/tmp/orcamento_1234.pdf',           -- caminho do arquivo no servidor
    'Orcamento_1234.pdf'
);
*/

-- ── EXEMPLO 3: Enviar para múltiplos clientes ───────────────────
/*
INSERT INTO whatsapp_queue (tenant_id, recipient, message_type, message_text)
VALUES
    ('loja_001', '5511999887766', 'text', 'Olá João, seu pedido está pronto!'),
    ('loja_001', '5511888776655', 'text', 'Olá Maria, sua nota fiscal foi emitida.'),
    ('loja_002', '5511777665544', 'text', 'Olá Carlos, sua proposta foi enviada por e-mail.');
*/

-- ── MONITORAR a fila em tempo real ──────────────────────────────
/*
SELECT
    id,
    tenant_id,
    recipient,
    message_type,
    LEFT(message_text, 50) AS preview,
    status,
    retry_count,
    created_at,
    processed_at,
    error_message
FROM whatsapp_queue
ORDER BY created_at DESC
LIMIT 50;
*/

-- ── VER histórico completo de mensagens ─────────────────────────
/*
SELECT
    ml.id,
    ml.tenant_id,
    ws.tenant_name,
    ml.recipient,
    ml.message_type,
    ml.status,
    ml.retry_count,
    ml.error_message,
    ml.sent_at,
    ml.created_at
FROM message_logs ml
JOIN whatsapp_sessions ws ON ws.tenant_id = ml.tenant_id
ORDER BY ml.created_at DESC
LIMIT 100;
*/

-- ── VER status das sessões por lojista ──────────────────────────
/*
SELECT
    tenant_id,
    tenant_name,
    phone,
    status,
    updated_at
FROM whatsapp_sessions
ORDER BY tenant_name;
*/

-- ── LIMPAR fila de teste ─────────────────────────────────────────
/*
DELETE FROM whatsapp_queue WHERE status IN ('sent', 'failed');
*/
