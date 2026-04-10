import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  ConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';

const MAX_RECONNECT_ATTEMPTS = 5;

export class SessionManager extends EventEmitter {
  private connections: Map<string, WASocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private deletingConnections: Set<string> = new Set();
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async initializeConnection(connectionId: string): Promise<void> {
    try {
      logger.info(`Inicializando conexão WhatsApp ${connectionId}`);

      // Fecha socket anterior sem fazer logout (preserva sessão)
      const existing = this.connections.get(connectionId);
      if (existing) {
        try { existing.end(undefined); } catch {}
        this.connections.delete(connectionId);
      }

      const connection = await this.prisma.whatsAppConnection.findUnique({
        where: { id: connectionId },
        include: { store: true },
      });

      if (!connection || !connection.isActive) {
        throw new Error(`Conexão ${connectionId} não encontrada ou inativa`);
      }

      // Limpa QR anterior para o frontend não exibir código expirado
      await this.prisma.whatsAppConnection.update({
        where: { id: connectionId },
        data: { status: 'disconnected', lastQrCode: null },
      });

      const { state, saveCreds } = await useMultiFileAuthState(
        `./auth_states/${connectionId}`
      );

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['SCOM WhatsApp', 'Chrome', '120.0.0'],
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection: connStatus, lastDisconnect, qr } = update;

        if (qr) {
          const qrCodeDataUrl = await QRCode.toDataURL(qr);
          await this.prisma.whatsAppConnection.update({
            where: { id: connectionId },
            data: {
              status: 'qr_pending',
              lastQrCode: qrCodeDataUrl,
            },
          });
          this.emit('qr', connectionId, qrCodeDataUrl);
          logger.info(`QR Code gerado para conexão ${connectionId}`);
        }

        if (connStatus === 'close') {
          this.connections.delete(connectionId);

          // Se está sendo deletada, não atualiza banco nem reconecta
          if (this.deletingConnections.has(connectionId)) return;

          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          logger.warn(`Conexão fechada ${connectionId}`, {
            shouldReconnect,
            statusCode,
            reason: lastDisconnect?.error?.message,
          });

          await this.prisma.whatsAppConnection.update({
            where: { id: connectionId },
            data: { status: 'disconnected' },
          });

          this.emit('disconnected', connectionId, lastDisconnect?.error?.message);

          // Só reconecta se estava conectado antes (tem sessão salva)
          const authDir = `./auth_states/${connectionId}`;
          const fs = await import('fs');
          const temSessao = fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0;

          const attempts = (this.reconnectAttempts.get(connectionId) || 0) + 1;
          if (shouldReconnect && temSessao && attempts <= MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts.set(connectionId, attempts);
            const delay = Math.min(5000 * attempts, 60000);
            setTimeout(() => this.initializeConnection(connectionId), delay);
          } else if (attempts > MAX_RECONNECT_ATTEMPTS) {
            logger.error(`Conexão ${connectionId} atingiu limite de reconexões`);
            this.reconnectAttempts.delete(connectionId);
          }
        }

        if (connStatus === 'open') {
          logger.info(`Conexão estabelecida ${connectionId}`);
          await this.prisma.whatsAppConnection.update({
            where: { id: connectionId },
            data: {
              status: 'connected',
              lastConnectedAt: new Date(),
            },
          });
          this.emit('connected', connectionId);
        }
      });

      this.connections.set(connectionId, sock);
      this.reconnectAttempts.delete(connectionId); // reset ao inicializar com sucesso
    } catch (error) {
      logger.error(`Erro ao inicializar conexão ${connectionId}`, error);
      throw error;
    }
  }

  getConnection(connectionId: string): WASocket | undefined {
    return this.connections.get(connectionId);
  }

  async sendMessage(
    connectionId: string,
    phone: string,
    message: string
  ): Promise<string> {
    const sock = this.getConnection(connectionId);
    if (!sock) {
      throw new Error(`Conexão não encontrada: ${connectionId}`);
    }

    const jid = `${phone}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text: message });
    return result?.key?.id || '';
  }

  async closeConnection(connectionId: string): Promise<void> {
    const sock = this.connections.get(connectionId);
    if (sock) {
      try { sock.end(undefined); } catch {}
      this.connections.delete(connectionId);
      logger.info(`Conexão encerrada ${connectionId}`);
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    this.deletingConnections.add(connectionId);
    this.reconnectAttempts.delete(connectionId);
    const sock = this.connections.get(connectionId);
    if (sock) {
      try { sock.end(undefined); } catch {}
      this.connections.delete(connectionId);
    }
    logger.info(`Conexão deletada ${connectionId}`);
  }
}
