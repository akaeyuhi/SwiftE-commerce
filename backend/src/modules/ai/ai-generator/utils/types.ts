export interface RateLimitConfig {
  capacity: number;
  refillRate: number;
  burstSize?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetTime: number;
  retryAfter?: number;
}
