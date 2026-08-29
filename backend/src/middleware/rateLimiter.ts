import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request } from 'express';
import redis from '../config/redis';

const byToken = (req: Request) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7, 40);
  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ??
    req.ip ??
    'unknown';
  // Collapse IPv6 addresses to their /56 subnet — without this a single IPv6 user
  // can walk through addresses in their own prefix and bypass the limit.
  return ipKeyGenerator(ip);
};

// Auth / OTP — strict, prevents brute force
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10,
  keyGenerator: byToken,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => (redis as any).call(...args), prefix: 'rl:auth:' }),
  message: { success: false, message: 'Too many auth attempts, please try again in 10 minutes.' },
});

// Order placement — prevents spam orders
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  keyGenerator: byToken,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => (redis as any).call(...args), prefix: 'rl:order:' }),
  message: { success: false, message: 'Too many order requests, please slow down.' },
});
