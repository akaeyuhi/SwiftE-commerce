/**
 * Simple in-memory token bucket rate limiter.
 *
 * Not clustered — for multi-instance use a Redis-based limiter.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  /**
   * @param capacity - maximum tokens
   * @param refillRatePerSec - tokens added per second
   */
  constructor(
    private capacity: number,
    private refillRatePerSec: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    const toAdd = elapsedSec * this.refillRatePerSec;
    if (toAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + toAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Try to take `count` tokens. Returns true if allowed, false otherwise.
   */
  take(count = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }
}
