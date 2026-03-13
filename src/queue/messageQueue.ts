import { Queue, Worker, QueueEvents } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';

const connectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

export interface MessageJob {
  storeId: string;
  messageLogId: string;
  recipientPhone: string;
  messageType: 'text' | 'pdf' | 'image';
  content?: string;
  mediaUrl?: string;
}

export const messageQueue = new Queue<MessageJob>('whatsapp-messages', {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: config.retry.maxAttempts,
    backoff: {
      type: 'exponential',
      delay: config.retry.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const queueEvents = new QueueEvents('whatsapp-messages', { connection: connectionOptions });

queueEvents.on('completed', ({ jobId }) => {
  logger.info(`Job ${jobId} completado com sucesso`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} falhou: ${failedReason}`);
});

logger.info('Fila BullMQ configurada');
