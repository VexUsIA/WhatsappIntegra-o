# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2024-01-XX

### Adicionado
- ✅ Integração WhatsApp via Baileys
- ✅ Painel web multi-tenant com autenticação JWT
- ✅ Sistema de filas robusto com BullMQ + Redis
- ✅ Polling de tabela PostgreSQL (compatível com SCOM)
- ✅ Suporte a múltiplas conexões por loja (até 3)
- ✅ Gerenciamento de sessões WhatsApp persistentes
- ✅ QR Code em tempo real no painel web
- ✅ Logs estruturados com Winston
- ✅ Reconexão automática
- ✅ Sistema de retry com backoff exponencial
- ✅ API REST para envio direto
- ✅ Simulador ERP completo para testes
- ✅ Docker Compose para ambiente de desenvolvimento
- ✅ Painel visual do simulador (HTML/CSS/JS)
- ✅ Documentação completa

### Funcionalidades
- Envio de mensagens de texto
- Dashboard com estatísticas em tempo real
- Histórico completo de mensagens
- Gerenciamento de conexões (conectar/desconectar)
- Health check endpoint
- Suporte multi-loja isolado

### Infraestrutura
- PostgreSQL 15+ para persistência
- Redis 7+ para filas
- Node.js 20 LTS
- TypeScript
- Prisma ORM

### Documentação
- README.md com Quick Start
- INSTALACAO_PAINEL.md
- INTEGRACAO_SIMULADOR.md
- SCOM_WhatsApp_Arquitetura_Tecnica.md
- CONTRIBUTING.md
- SECURITY.md

## [Unreleased]

### Planejado
- [ ] Envio de PDF e imagens
- [ ] Bull Board para monitoramento visual de filas
- [ ] Health check avançado
- [ ] Testes automatizados (Jest/Vitest)
- [ ] CI/CD com GitHub Actions
- [ ] Suporte a mensagens de template
- [ ] Webhook para receber mensagens
- [ ] Métricas com Prometheus
- [ ] Alertas via email/Slack
- [ ] Rate limiting
- [ ] Compressão de imagens
- [ ] Agendamento de mensagens

---

[1.0.0]: https://github.com/seu-usuario/scom-whatsapp-integration/releases/tag/v1.0.0
