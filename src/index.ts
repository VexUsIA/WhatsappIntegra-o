import { PrismaClient } from '@prisma/client';
import { SessionManager } from './whatsapp/SessionManager';
import { MessageProcessor } from './queue/messageProcessor';
import { DatabasePoller } from './database/poller';
import { createServer } from './api/server';
import { logger } from './utils/logger';
import { config } from './config';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Iniciando serviço de integração SCOM-WhatsApp');

    // Testar conexão com banco
    await prisma.$connect();
    logger.info('Conexão com PostgreSQL estabelecida');

    const sessionManager = new SessionManager(prisma);

    sessionManager.on('qr', (connectionId, qrCode) => {
      logger.info(`QR Code gerado para conexão ${connectionId}`);
    });

    sessionManager.on('connected', (connectionId) => {
      logger.info(`Conexão ${connectionId} conectada ao WhatsApp`);
    });

    sessionManager.on('disconnected', (connectionId, reason) => {
      logger.warn(`Conexão ${connectionId} desconectada: ${reason}`);
    });

    // Inicializar conexões WhatsApp (não bloquear se falhar)
    try {
      const activeConnections = await prisma.whatsAppConnection.findMany({
        where: { isActive: true },
        include: { store: true },
      });

      logger.info(`Encontradas ${activeConnections.length} conexões ativas`);

      for (const connection of activeConnections) {
        if (connection.store.isActive) {
          try {
            await sessionManager.initializeConnection(connection.id);
          } catch (error) {
            logger.error(`Erro ao inicializar conexão ${connection.id}`, error);
          }
        }
      }
    } catch (error) {
      logger.warn('Nenhuma conexão WhatsApp encontrada ou erro ao buscar', error);
    }

    const messageProcessor = new MessageProcessor(prisma, sessionManager);

    const poller = new DatabasePoller(prisma);
    await poller.start();

    const server = await createServer(prisma, sessionManager);
    await server.listen({ port: config.port, host: '0.0.0.0' });

    logger.info(`API REST rodando na porta ${config.port}`);
    logger.info(`Health check disponível em http://localhost:${config.port}/health`);
    logger.info('Serviço iniciado com sucesso');

    const shutdown = async () => {
      logger.info('Encerrando serviço...');
      await poller.stop();
      await messageProcessor.close();
      await server.close();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Erro ao iniciar serviço', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
