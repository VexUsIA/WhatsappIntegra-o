import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

export interface JWTPayload {
  storeId: string;
  storeCode: string;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    (request as any).user = payload;
  } catch (error) {
    reply.status(401).send({ error: 'Token inválido ou expirado' });
  }
}
