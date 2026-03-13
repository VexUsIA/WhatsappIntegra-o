import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  scomDb: {
    host: process.env.SCOM_DB_HOST || 'localhost',
    port: parseInt(process.env.SCOM_DB_PORT || '5432', 10),
    database: process.env.SCOM_DB_NAME || 'scom_db',
    user: process.env.SCOM_DB_USER || 'scom_user',
    password: process.env.SCOM_DB_PASSWORD || 'scom_password',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '2000', 10),
  },

  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    backoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '5000', 10),
  },

  healthCheck: {
    intervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '30000', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },
};

// Log de debug para verificar configurações
if (config.env === 'production') {
  console.log('Redis config:', {
    host: config.redis.host,
    port: config.redis.port,
    hasPassword: !!config.redis.password,
  });
}
