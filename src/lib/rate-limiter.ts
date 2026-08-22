/**
 * Client & Infrastructure API Rate Limiter
 * Utility for client-side and edge action throttling to protect endpoints and user actions from spam/abuse.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class MemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if an key (action/ip/user) has exceeded the specified rate limit.
   * Returns true if allowed, false if rate limited.
   */
  public isAllowed(
    key: string,
    config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 },
  ): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const timestamps = (this.requests.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= config.maxRequests) {
      return false;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }

  /**
   * Reset rate limit state for a key.
   */
  public reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new MemoryRateLimiter();
