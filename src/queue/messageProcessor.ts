import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SessionManager } from '../whatsapp/SessionManager';
import { MessageJob } from './messageQueue';
import { logger } from '../utils/logger';
import { config } from '../config';

const connectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

export class MessageProcessor {
  private worker: Worker;
  private prisma: PrismaClient;
  private sessionManager: SessionManager;

  constructor(prisma: PrismaClient, sessionManager: SessionManager) {
    this.prisma = prisma;
    this.sessionManager = sessionManager;

    this.worker = new Worker<MessageJob>(
      'whatsapp-messages',
      async (job: Job<MessageJob>) => this.processMessage(job),
      {
        connection: connectionOptions,
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Mensagem processada: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Falha ao processar mensagem ${job?.id}: ${err.message}`);
    });

    logger.info('Worker de mensagens iniciado');
  }

  private async processMessage(job: Job<MessageJob>): Promise<void> {
    const { storeId, messageLogId, recipientPhone, messageType, content } = job.data;

    try {
      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: { status: 'processing' },
      });

      const messageLog = await this.prisma.messageLog.findUnique({
        where: { id: messageLogId },
        include: { connection: true },
      });

      if (!messageLog) throw new Error('MessageLog não encontrado');

      let whatsappId: string;

      switch (messageType) {
        case 'text':
          if (!content) throw new Error('Conteúdo da mensagem não fornecido');
          whatsappId = await this.sessionManager.sendMessage(
            messageLog.connectionId,
            recipientPhone,
            content
          );
          break;

        case 'pdf':
        case 'image':
          throw new Error('Envio de mídia ainda não implementado');

        default:
          throw new Error(`Tipo de mensagem não suportado: ${messageType}`);
      }

      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: 'sent',
          whatsappId,
          sentAt: new Date(),
        },
      });

      logger.info(`Mensagem enviada com sucesso: ${messageLogId}`);
    } catch (error: any) {
      const retryCount = job.attemptsMade;

      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: retryCount >= config.retry.maxAttempts ? 'failed' : 'pending',
          errorMessage: error.message,
          retryCount,
        },
      });

      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    logger.info('Worker de mensagens encerrado');
  }
}
