import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const byToken = (req: Request) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7, 40);
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ??
    req.ip ??
    'unknown'
  );
};

// Auth / OTP — strict, prevents brute force
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10,
  keyGenerator: byToken,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 10 minutes.' },
});

// Order placement — prevents spam orders
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  keyGenerator: byToken,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many order requests, please slow down.' },
});
