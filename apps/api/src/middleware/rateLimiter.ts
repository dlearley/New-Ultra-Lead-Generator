import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// CRM push endpoints rate limiter (more restrictive)
export const crmPushRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 CRM push requests per minute
  message: {
    error: 'Too many CRM push requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // Use organization ID if available, otherwise IP
    return req.headers['x-organization-id'] as string || req.ip;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('CRM push rate limit exceeded', {
      ip: req.ip,
      organizationId: req.headers['x-organization-id'],
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    res.status(429).json({
      error: 'Too many CRM push requests, please try again later.',
      retryAfter: '1 minute',
    });
  },
});

// Field mapping endpoints rate limiter
export const fieldMappingRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 field mapping requests per 5 minutes
  message: {
    error: 'Too many field mapping requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Field mapping rate limit exceeded', {
      ip: req.ip,
      organizationId: req.headers['x-organization-id'],
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    res.status(429).json({
      error: 'Too many field mapping requests, please try again later.',
      retryAfter: '5 minutes',
    });
  },
});