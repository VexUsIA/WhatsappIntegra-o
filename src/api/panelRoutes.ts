import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { SessionManager } from '../whatsapp/SessionManager';
import { authMiddleware, generateToken, JWTPayload } from './auth';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const createConnectionSchema = z.object({
  connectionName: z.string().min(3),
  phoneNumber: z.string().min(10),
});

export async function registerPanelRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  sessionManager: SessionManager
) {
  // Login
  fastify.post('/api/panel/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const store = await prisma.store.findUnique({
        where: { email },
      });

      if (!store || !store.isActive) {
        reply.status(401).send({ error: 'Credenciais inválidas' });
        return;
      }

      const validPassword = await bcrypt.compare(password, store.password);
      if (!validPassword) {
        reply.status(401).send({ error: 'Credenciais inválidas' });
        return;
      }

      const token = generateToken({
        storeId: store.id,
        storeCode: store.storeCode,
        email: store.email,
      });

      return {
        success: true,
        token,
        store: {
          id: store.id,
          storeCode: store.storeCode,
          storeName: store.storeName,
          email: store.email,
        },
      };
    } catch (error: any) {
      reply.status(400).send({ error: error.message });
    }
  });

  // Dashboard - Informações da loja logada
  fastify.get(
    '/api/panel/dashboard',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;

      const connections = await prisma.whatsAppConnection.findMany({
        where: { storeId: user.storeId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      const stats = await prisma.messageLog.groupBy({
        by: ['status'],
        where: { storeId: user.storeId },
        _count: true,
      });

      const recentMessages = await prisma.messageLog.findMany({
        where: { storeId: user.storeId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          connection: {
            select: { connectionName: true, phoneNumber: true },
          },
        },
      });

      return {
        connections,
        stats,
        recentMessages,
      };
    }
  );

  // Listar conexões da loja
  fastify.get(
    '/api/panel/connections',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;

      const connections = await prisma.whatsAppConnection.findMany({
        where: { storeId: user.storeId },
        orderBy: { createdAt: 'asc' },
      });

      return { connections };
    }
  );

  // Criar nova conexão
  fastify.post(
    '/api/panel/connections',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;
      const data = createConnectionSchema.parse(request.body);

      // Verificar limite de 3 conexões
      const count = await prisma.whatsAppConnection.count({
        where: { storeId: user.storeId, isActive: true },
      });

      if (count >= 3) {
        reply.status(400).send({
          error: 'Limite de 3 conexões atingido',
        });
        return;
      }

      const connection = await prisma.whatsAppConnection.create({
        data: {
          storeId: user.storeId,
          connectionName: data.connectionName,
          phoneNumber: data.phoneNumber,
        },
      });

      // Inicializar sessão WhatsApp
      await sessionManager.initializeConnection(connection.id);

      return { success: true, connection };
    }
  );

  // Status de uma conexão específica (com QR Code)
  fastify.get(
    '/api/panel/connections/:connectionId/status',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;
      const { connectionId } = request.params as { connectionId: string };

      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          id: connectionId,
          storeId: user.storeId, // Garante que só vê suas próprias conexões
        },
      });

      if (!connection) {
        reply.status(404).send({ error: 'Conexão não encontrada' });
        return;
      }

      return {
        id: connection.id,
        connectionName: connection.connectionName,
        phoneNumber: connection.phoneNumber,
        status: connection.status,
        lastConnectedAt: connection.lastConnectedAt,
        qrCode: connection.status === 'qr_pending' ? connection.lastQrCode : null,
      };
    }
  );

  // Desconectar uma conexão
  fastify.post(
    '/api/panel/connections/:connectionId/disconnect',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;
      const { connectionId } = request.params as { connectionId: string };

      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          id: connectionId,
          storeId: user.storeId,
        },
      });

      if (!connection) {
        reply.status(404).send({ error: 'Conexão não encontrada' });
        return;
      }

      await sessionManager.closeConnection(connectionId);

      return { success: true };
    }
  );

  // Reconectar uma conexão
  fastify.post(
    '/api/panel/connections/:connectionId/reconnect',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;
      const { connectionId } = request.params as { connectionId: string };

      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          id: connectionId,
          storeId: user.storeId,
        },
      });

      if (!connection) {
        reply.status(404).send({ error: 'Conexão não encontrada' });
        return;
      }

      await sessionManager.initializeConnection(connectionId);

      return { success: true };
    }
  );

  // Excluir uma conexão
  fastify.delete(
    '/api/panel/connections/:connectionId',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;
      const { connectionId } = request.params as { connectionId: string };

      const connection = await prisma.whatsAppConnection.findFirst({
        where: { id: connectionId, storeId: user.storeId },
      });

      if (!connection) {
        reply.status(404).send({ error: 'Conexão não encontrada' });
        return;
      }

      // Encerra sessão ativa sem reconectar
      await sessionManager.deleteConnection(connectionId);

      await prisma.whatsAppConnection.delete({ where: { id: connectionId } });

      return { success: true };
    }
  );

  // Histórico de mensagens da loja
  fastify.get(
    '/api/panel/messages',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = (request as any).user as JWTPayload;
      const { page = 1, limit = 50 } = request.query as any;

      const messages = await prisma.messageLog.findMany({
        where: { storeId: user.storeId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        include: {
          connection: {
            select: { connectionName: true, phoneNumber: true },
          },
        },
      });

      const total = await prisma.messageLog.count({
        where: { storeId: user.storeId },
      });

      return {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    }
  );
}
