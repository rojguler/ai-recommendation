// Redis Cache Service - Provides a thin caching layer for expensive API calls
const redis = require('redis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

let client;
let isEnabled = false;
let connectionAttempted = false;
let lastErrorTime = 0;

async function connect() {
  if (process.env.REDIS_DISABLED === 'true') {
    logger.warn('Redis caching disabled via REDIS_DISABLED=true');
    return;
  }

  if (connectionAttempted) {
    return; // Don't try to reconnect if already attempted
  }

  connectionAttempted = true;

  try {
    client = redis.createClient({ 
      url: REDIS_URL,
      socket: {
        reconnectStrategy: false // Disable auto-reconnect to prevent spam
      }
    });

    client.on('error', (err) => {
      isEnabled = false;
      // Only log error once per minute to prevent spam
      const now = Date.now();
      if (now - lastErrorTime > 60000) {
        logger.warn('Redis not available, caching disabled', { error: err.message });
        lastErrorTime = now;
      }
    });

    client.on('connect', () => {
      isEnabled = true;
      logger.info('Redis cache connected', { url: REDIS_URL });
    });

    await client.connect();
  } catch (error) {
    isEnabled = false;
    logger.warn('Redis not available, continuing without cache', { error: error.message });
    // Don't throw - app should work without Redis
  }
}

connect();

const cacheService = {
  isEnabled: () => isEnabled,

  async get(key) {
    if (!isEnabled || !client) return null;
    try {
      const value = await client.get(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      // Silently fail - cache is optional
      isEnabled = false;
      return null;
    }
  },

  async set(key, value, ttlSeconds = 3600) {
    if (!isEnabled || !client || value === undefined) return;
    try {
      await client.set(key, JSON.stringify(value), {
        EX: ttlSeconds
      });
    } catch (error) {
      // Silently fail - cache is optional
      isEnabled = false;
    }
  },

  async del(key) {
    if (!isEnabled || !client) return;
    try {
      await client.del(key);
    } catch (error) {
      // Silently fail - cache is optional
      isEnabled = false;
    }
  },

  async getOrSet(key, ttlSeconds, fetchFn) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const freshValue = await fetchFn();
    if (freshValue !== undefined && freshValue !== null) {
      await this.set(key, freshValue, ttlSeconds);
    }
    return freshValue;
  }
};

module.exports = cacheService;

