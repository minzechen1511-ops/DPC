import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyFn?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key =
      options.keyFn?.(req) ||
      String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local-owner');

    const now = Date.now();
    const cutoff = now - options.windowMs;
    const recent = (hits.get(key) || []).filter((ts) => ts > cutoff);

    if (recent.length >= options.maxRequests) {
      const retryAfter = Math.ceil((recent[0] + options.windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait briefly before retrying.',
        code: 'RATE_LIMITED',
        retryAfterSeconds: Math.max(1, retryAfter),
      });
    }

    recent.push(now);
    hits.set(key, recent);
    return next();
  };
}
