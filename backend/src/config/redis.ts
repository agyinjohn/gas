import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const redis = redisUrl
  ? new Redis(redisUrl, { maxRetriesPerRequest: 3, retryStrategy: (t) => Math.min(t * 200, 2000) })
  : new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      username: process.env.REDIS_USERNAME ?? 'default',
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy: (t) => Math.min(t * 200, 2000),
    });

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.error('[Redis] Error:', err.message));

export default redis;
