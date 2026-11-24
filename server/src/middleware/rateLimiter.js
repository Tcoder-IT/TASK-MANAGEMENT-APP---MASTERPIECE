import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { createAuthRateLimitKey } from '../utils/authRateLimitKey.js';

const skipInTest = () => env.NODE_ENV === 'test';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, _res) => {
    throw new ApiError(429, 'Too many requests, please try again later');
  },
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX_REQUESTS,
  keyGenerator: (req) => createAuthRateLimitKey(req.ip, req.body?.email),
  message: {
    success: false,
    message: 'Too many attempts for this account from your network. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, _res) => {
    throw new ApiError(429, 'Too many authentication attempts, please try again later');
  },
});