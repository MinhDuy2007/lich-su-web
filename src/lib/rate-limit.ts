type BucketRecord = {
  count: number;
  resetAt: number;
};

const bucket = new Map<string, BucketRecord>();

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export function checkRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const current = bucket.get(options.key);

  if (!current || current.resetAt < now) {
    const next = {
      count: 1,
      resetAt: now + options.windowMs
    };
    bucket.set(options.key, next);
    return {
      allowed: true,
      remaining: options.limit - next.count,
      resetAt: next.resetAt
    };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt
    };
  }

  current.count += 1;
  bucket.set(options.key, current);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt
  };
}

