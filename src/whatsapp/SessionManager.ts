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

export class SessionManager extends EventEmitter {
  private connections: Map<string, WASocket> = new Map();
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async initializeConnection(connectionId: string): Promise<void> {
    try {
      logger.info(`Inicializando conexão WhatsApp ${connectionId}`);

      const connection = await this.prisma.whatsAppConnection.findUnique({
        where: { id: connectionId },
        include: { store: true },
      });

      if (!connection || !connection.isActive) {
        throw new Error(`Conexão ${connectionId} não encontrada ou inativa`);
      }

      const { state, saveCreds } = await useMultiFileAuthState(
        `./auth_states/${connectionId}`
      );

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
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
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;

          logger.warn(`Conexão fechada ${connectionId}`, {
            shouldReconnect,
            reason: lastDisconnect?.error,
          });

          await this.prisma.whatsAppConnection.update({
            where: { id: connectionId },
            data: { status: 'disconnected' },
          });

          this.connections.delete(connectionId);
          this.emit('disconnected', connectionId, lastDisconnect?.error?.message);

          if (shouldReconnect) {
            setTimeout(() => this.initializeConnection(connectionId), 5000);
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
      await sock.logout();
      this.connections.delete(connectionId);
      logger.info(`Conexão fechada ${connectionId}`);
    }
  }
}
