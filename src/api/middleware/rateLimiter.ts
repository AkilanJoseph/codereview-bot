import rateLimit from 'express-rate-limit';

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // GitHub sends at most a handful per second; 60/min is generous
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    meta: null,
    error: { code: 'RATE_LIMITED', message: 'Too many webhook requests' },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    meta: null,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
  },
});
