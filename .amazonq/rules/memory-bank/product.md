# Product Overview — SCOM WhatsApp Integration Service

## Purpose
Node.js service that bridges SCOM ERP with WhatsApp, enabling automated message delivery from ERP events to customers via WhatsApp. Eliminates manual messaging by polling a PostgreSQL queue table that SCOM writes to, then dispatching messages through persistent WhatsApp sessions.

## Value Proposition
- Zero-friction integration: SCOM writes to a DB table; this service handles the rest
- No repeated QR Code scanning: auth state is persisted per connection
- Multi-tenant isolation: each store manages its own connections and message history
- Resilient delivery: BullMQ + Redis provides automatic retry on failure

## Key Features
- Persistent WhatsApp sessions via Baileys (auth state stored in DB as JSON)
- Robust message queue with BullMQ + Redis (retry, backoff, dead-letter)
- Multi-tenant (multi-store) architecture — up to 3 WhatsApp connections per store
- Private web panel per store (JWT-authenticated dashboard)
- REST API for direct message sending
- PostgreSQL poller compatible with existing SCOM schema
- Structured logging with Winston (file rotation + console)
- Auto-reconnect on session drop

## Target Users
- SCOM ERP operators who need automated WhatsApp notifications to customers
- Store administrators who manage WhatsApp connections via the web panel
- Developers integrating SCOM with WhatsApp programmatically via REST API

## Use Cases
1. SCOM inserts a row into `whatsapp_queue` → service picks it up and sends the WhatsApp message
2. Store admin scans QR Code once via web panel → session persists indefinitely
3. External system calls `POST /api/messages/send` to trigger a message directly
4. Admin monitors delivery status, connection health, and message history via dashboard
