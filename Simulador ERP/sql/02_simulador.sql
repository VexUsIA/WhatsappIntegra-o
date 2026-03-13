-- ============================================================
--  SIMULADOR RÁPIDO DO SCOM
--  Cole estes comandos no Adminer (http://localhost:8080)
--  para simular o ERP enviando mensagens
-- ============================================================
--
--  Conexão Adminer:
--    Sistema:   PostgreSQL
--    Servidor:  postgres
--    Usuário:   scom_user
--    Senha:     scom_pass
--    Base:      scom_wpp
-- ============================================================


-- ── 1. Enviar mensagem de TEXTO simples ─────────────────────────
INSERT INTO whatsapp_queue (tenant_id, recipient, message_type, message_text)
VALUES (
    'loja_001',
    '5511999887766',   -- ← TROQUE pelo seu número real para testar
    'text',
    'Olá! Passando para avisar que seu orçamento nº 1234 foi aprovado. Pode passar na loja!'
);


-- ── 2. Simular envio de NOTA FISCAL (PDF) ───────────────────────
INSERT INTO whatsapp_queue (tenant_id, recipient, message_type, message_text, file_name)
VALUES (
    'loja_001',
    '5511999887766',   -- ← TROQUE pelo seu número real para testar
    'pdf',
    'Segue sua Nota Fiscal em anexo. Obrigado pela preferência!',
    'NF_00123.pdf'
);


-- ── 3. Simular envio de PROPOSTA ────────────────────────────────
INSERT INTO whatsapp_queue (tenant_id, recipient, message_type, message_text, file_name)
VALUES (
    'loja_001',
    '5511999887766',   -- ← TROQUE pelo seu número real para testar
    'pdf',
    'Olá! Preparamos uma proposta especial para você. Segue em anexo!',
    'Proposta_Comercial_2026.pdf'
);


-- ── 4. Monitorar o que está na fila agora ───────────────────────
SELECT id, tenant_id, recipient, message_type, status, created_at, error_message
FROM whatsapp_queue
ORDER BY created_at DESC
LIMIT 20;


-- ── 5. Ver mensagens enviadas com sucesso ───────────────────────
SELECT id, tenant_id, recipient, status, sent_at
FROM message_logs
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 20;


-- ── 6. Ver mensagens com erro ───────────────────────────────────
SELECT id, tenant_id, recipient, status, retry_count, error_message, created_at
FROM message_logs
WHERE status = 'failed'
ORDER BY created_at DESC;


-- ── 7. Ver status das sessões dos lojistas ──────────────────────
SELECT tenant_id, tenant_name, status, updated_at
FROM whatsapp_sessions;
