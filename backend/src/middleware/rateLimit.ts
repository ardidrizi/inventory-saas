import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const isTest = env.NODE_ENV === 'test';
const isDevelopment = env.NODE_ENV === 'development';

export const apiLimiter = rateLimit({
  skip: () => isTest || isDevelopment,
  windowMs: FIFTEEN_MINUTES,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  skip: () => isTest,
  windowMs: FIFTEEN_MINUTES,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});
