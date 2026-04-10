import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { SessionManager } from '../whatsapp/SessionManager';
import { messageQueue } from '../queue/messageQueue';
import { logger } from '../utils/logger';
import { z } from 'zod';
import path from 'path';
import { registerPanelRoutes } from './panelRoutes';

const sendMessageSchema = z.object({
  storeId: z.string().uuid(),
  recipientPhone: z.string().min(10),
  messageType: z.enum(['text', 'pdf', 'image']),
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
});

export async function createServer(
  prisma: PrismaClient,
  sessionManager: SessionManager
) {
  const fastify = Fastify({ logger: false });

  // Rotas registradas antes do static para não serem interceptadas
  await registerPanelRoutes(fastify, prisma, sessionManager);

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.post('/api/messages/send', async (request, reply) => {
    try {
      const data = sendMessageSchema.parse(request.body);

      const connection = await prisma.whatsAppConnection.findFirst({
        where: { storeId: data.storeId, isActive: true, status: 'connected' },
      });

      if (!connection) {
        reply.status(400).send({ success: false, error: 'Nenhuma conexão ativa encontrada para esta loja' });
        return;
      }

      const messageLog = await prisma.messageLog.create({
        data: {
          storeId: data.storeId,
          connectionId: connection.id,
          recipientPhone: data.recipientPhone,
          messageType: data.messageType,
          content: data.content,
          mediaUrl: data.mediaUrl,
          status: 'pending',
        },
      });

      await messageQueue.add('whatsapp-messages', {
        storeId: data.storeId,
        messageLogId: messageLog.id,
        recipientPhone: data.recipientPhone,
        messageType: data.messageType,
        content: data.content,
        mediaUrl: data.mediaUrl,
      });

      return { success: true, messageId: messageLog.id };
    } catch (error: any) {
      logger.error('Erro ao enviar mensagem via API', error);
      reply.status(400).send({ success: false, error: error.message });
    }
  });

  fastify.get('/api/messages/:messageId', async (request, reply) => {
    const { messageId } = request.params as { messageId: string };

    const message = await prisma.messageLog.findUnique({ where: { id: messageId } });

    if (!message) {
      reply.status(404).send({ error: 'Mensagem não encontrada' });
      return;
    }

    return message;
  });

  // Static registrado por último com wildcard:false para não interceptar rotas da API
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../public'),
    prefix: '/',
    wildcard: false,
  });

  return fastify;
}
