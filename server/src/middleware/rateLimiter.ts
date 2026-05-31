import type { NextFunction, Request, Response } from 'express';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

const store = new Map<string, number[]>();

export function rateLimiter({ windowMs, max, keyGenerator }: RateLimiterOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip ?? 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= max) {
      store.set(key, timestamps);
      return res.status(429).json({ error: 'Too many requests' });
    }

    timestamps.push(now);
    store.set(key, timestamps);
    return next();
  };
}
