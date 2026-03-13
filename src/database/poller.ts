import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { messageQueue } from './messageQueue';
import { logger } from '../utils/logger';
import { config } from '../config';

interface QueueRecord {
  id: number;
  tenant_id: string;
  recipient: string;
  message_type: 'text' | 'pdf' | 'image';
  message_text?: string;
  file_path?: string;
  file_name?: string;
  status: string;
}

export class DatabasePoller {
  private pool: Pool;
  private prisma: PrismaClient;
  private intervalId?: NodeJS.Timeout;
  private isPolling = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.pool = new Pool({
      host: config.scomDb.host,
      port: config.scomDb.port,
      database: config.scomDb.database,
      user: config.scomDb.user,
      password: config.scomDb.password,
    });
  }

  async start(): Promise<void> {
    logger.info('Iniciando polling da tabela whatsapp_queue');

    this.intervalId = setInterval(async () => {
      if (!this.isPolling) {
        await this.poll();
      }
    }, config.polling.intervalMs);
  }

  private async poll(): Promise<void> {
    this.isPolling = true;

    try {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        const result = await client.query<QueueRecord>(
          `SELECT * FROM whatsapp_queue 
           WHERE status = 'pending' 
           ORDER BY created_at ASC 
           LIMIT 10 
           FOR UPDATE SKIP LOCKED`
        );

        if (result.rows.length > 0) {
          logger.info(`${result.rows.length} mensagens encontradas na fila`);

          for (const record of result.rows) {
            await this.processRecord(record);

            await client.query(
              'UPDATE whatsapp_queue SET status = $1, updated_at = NOW() WHERE id = $2',
              ['processing', record.id]
            );
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Erro no polling da fila', error);
    } finally {
      this.isPolling = false;
    }
  }

  private async processRecord(record: QueueRecord): Promise<void> {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id: record.tenant_id },
        include: { connections: { where: { isActive: true }, take: 1 } },
      });

      if (!store || store.connections.length === 0) {
        logger.error(`Loja ${record.tenant_id} sem conexões ativas`);
        return;
      }

      const connection = store.connections[0];

      const messageLog = await this.prisma.messageLog.create({
        data: {
          storeId: record.tenant_id,
          connectionId: connection.id,
          externalId: record.id.toString(),
          recipientPhone: record.recipient,
          messageType: record.message_type,
          content: record.message_text,
          mediaUrl: record.file_path,
          status: 'pending',
        },
      });

      await messageQueue.add('send-message', {
        storeId: record.tenant_id,
        messageLogId: messageLog.id,
        recipientPhone: record.recipient,
        messageType: record.message_type,
        content: record.message_text,
        mediaUrl: record.file_path,
      });

      logger.info(`Mensagem ${record.id} adicionada à fila BullMQ`);
    } catch (error: any) {
      logger.error(`Erro ao processar registro ${record.id}`, error);
    }
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      logger.info('Polling interrompido');
    }
    await this.pool.end();
  }
}
