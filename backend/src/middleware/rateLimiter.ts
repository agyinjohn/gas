import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth/OTP routes
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, please try again in 10 minutes.' },
});

// Order placement — per user token (keyGenerator uses Authorization header)
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => req.headers.authorization || req.ip || 'unknown',
  message: { success: false, message: 'Too many order requests, please slow down.' },
});
