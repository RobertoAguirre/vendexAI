const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => {
      logger.error('Error de Redis:', err);
    });

    redisClient.on('connect', () => {
      logger.info('🔴 Redis conectado');
    });

    redisClient.on('ready', () => {
      logger.info('🔴 Redis listo para usar');
    });

    redisClient.on('end', () => {
      logger.warn('🔴 Redis desconectado');
    });

    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.error('Error conectando a Redis:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client no inicializado');
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };