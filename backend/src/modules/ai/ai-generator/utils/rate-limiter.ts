// src/modules/ai/ai-generator/utils/rate-limiter.ts
import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitConfig {
  capacity: number;
  refillRate: number; // tokens per second
  burstSize?: number; // max tokens that can be consumed at once
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Enhanced token bucket rate limiter with burst support
 * and distributed-system-friendly design.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly config: RateLimitConfig) {
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens with detailed result
   */
  tryConsume(count: number = 1): RateLimitResult {
    this.refill();

    const burstSize = this.config.burstSize || this.config.capacity;

    if (count > burstSize) {
      return {
        allowed: false,
        remainingTokens: this.tokens,
        resetTime: this.getNextRefillTime(),
        retryAfter: Math.ceil((count / this.config.refillRate) * 1000),
      };
    }

    if (this.tokens >= count) {
      this.tokens -= count;
      return {
        allowed: true,
        remainingTokens: this.tokens,
        resetTime: this.getNextRefillTime(),
      };
    }

    const tokensNeeded = count - this.tokens;
    const retryAfter = Math.ceil(
      (tokensNeeded / this.config.refillRate) * 1000
    );

    return {
      allowed: false,
      remainingTokens: this.tokens,
      resetTime: this.getNextRefillTime(),
      retryAfter,
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  take(count: number = 1): boolean {
    return this.tryConsume(count).allowed;
  }

  /**
   * Get current status without consuming tokens
   */
  getStatus(): {
    availableTokens: number;
    capacity: number;
    refillRate: number;
    nextRefillTime: number;
  } {
    this.refill();

    return {
      availableTokens: this.tokens,
      capacity: this.config.capacity,
      refillRate: this.config.refillRate,
      nextRefillTime: this.getNextRefillTime(),
    };
  }

  /**
   * Get the next time when tokens will be available
   */
  getNextRefillTime(): number {
    const secondsUntilFull =
      (this.config.capacity - this.tokens) / this.config.refillRate;
    return Date.now() + secondsUntilFull * 1000;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;

    if (elapsedSec > 0) {
      const tokensToAdd = elapsedSec * this.config.refillRate;
      this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

/**
 * Multi-tenant rate limiter that manages separate buckets per tenant
 */
@Injectable()
export class MultiTenantRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly logger = new Logger(MultiTenantRateLimiter.name);

  // Cleanup inactive buckets periodically
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 60 * 1000; // 1 minute

  constructor(private readonly config: RateLimitConfig) {}

  /**
   * Try to consume tokens for a specific tenant
   */
  tryConsume(tenantId: string, count: number = 1): RateLimitResult {
    const bucket = this.getBucket(tenantId);
    const result = bucket.tryConsume(count);

    // Periodic cleanup
    this.maybeCleanup();

    return result;
  }

  /**
   * Get rate limit status for a tenant
   */
  getStatus(tenantId: string) {
    const bucket = this.getBucket(tenantId);
    return bucket.getStatus();
  }

  /**
   * Get all tenant statuses (for monitoring)
   */
  getAllStatuses(): Map<string, any> {
    this.maybeCleanup();

    const statuses = new Map();
    for (const [tenantId, bucket] of this.buckets) {
      statuses.set(tenantId, bucket.getStatus());
    }

    return statuses;
  }

  /**
   * Reset rate limits for a tenant (useful for testing)
   */
  resetTenant(tenantId: string): void {
    this.buckets.delete(tenantId);
    this.logger.debug(`Reset rate limit bucket for tenant: ${tenantId}`);
  }

  /**
   * Get current bucket count (for monitoring)
   */
  getActiveBucketCount(): number {
    return this.buckets.size;
  }

  private getBucket(tenantId: string): TokenBucket {
    let bucket = this.buckets.get(tenantId);

    if (!bucket) {
      bucket = new TokenBucket(this.config);
      this.buckets.set(tenantId, bucket);

      this.logger.debug(`Created rate limit bucket for tenant: ${tenantId}`);
    }

    return bucket;
  }

  private maybeCleanup(): void {
    const now = Date.now();

    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    let cleanedCount = 0;
    const bucketEntries = Array.from(this.buckets.entries());

    // Remove buckets that are at full capacity (likely unused)
    for (const [tenantId, bucket] of bucketEntries) {
      const status = bucket.getStatus();

      // If bucket is full and hasn't been used (approximation), consider it idle
      if (status.availableTokens >= status.capacity * 0.9) {
        this.buckets.delete(tenantId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} idle rate limit buckets`);
    }

    this.lastCleanup = now;
  }
}

/**
 * Simple rate limiter for backwards compatibility
 */
export class SimpleRateLimiter {
  private readonly bucket: TokenBucket;

  constructor(capacity: number, refillRatePerSec: number) {
    this.bucket = new TokenBucket({
      capacity,
      refillRate: refillRatePerSec,
    });
  }

  take(count: number = 1): boolean {
    return this.bucket.take(count);
  }

  getStatus() {
    return this.bucket.getStatus();
  }
}
