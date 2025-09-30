import { Injectable } from '@nestjs/common';
import { CacheOptions } from 'src/common/interfaces/infrastructure/cache.interface';

/**
 * BaseCacheService
 *
 * Abstract service for caching operations with consistent patterns across
 * different cache backends (Redis, Memcached, in-memory, etc.)
 *
 * Subclasses must implement:
 * - `getValue`: Retrieve value from cache
 * - `setValue`: Store value in cache
 * - `deleteValue`: Remove specific key from cache
 * - `clearCache`: Clear all cache entries
 *
 * Common functionality provided:
 * - `get`/`set`/`del`: Main caching interface with options
 * - `getOrSet`: Cache-aside pattern with fallback function
 * - `invalidateByTags`: Bulk invalidation by cache tags
 * - `increment`/`decrement`: Atomic counter operations
 * - Key generation helpers and TTL management
 *
 * Generics:
 * - `Key` — Type of cache keys (usually string)
 * - `Value` — Type of cached values
 */
@Injectable()
export abstract class BaseCacheService<Key = string, Value = any> {
  /**
   * Default TTL for cache entries (seconds)
   */
  protected readonly defaultTTL: number = 3600; // 1 hour

  /**
   * Key prefix to namespace cache entries
   */
  protected readonly keyPrefix: string = '';

  /**
   * Whether to serialize/deserialize values by default
   */
  protected readonly defaultSerialization: boolean = true;

  /**
   * Retrieve raw value from cache backend.
   *
   * @param key - cache key to retrieve
   * @returns Promise resolving to cached value or null if not found
   */
  protected abstract getValue(key: string): Promise<Value | null>;

  /**
   * Store raw value in cache backend.
   *
   * @param key - cache key
   * @param value - value to cache
   * @param ttlSeconds - time to live in seconds
   * @param tags - cache tags for invalidation
   * @returns Promise resolving when value is stored
   */
  protected abstract setValue(
    key: string,
    value: Value,
    ttlSeconds?: number,
    tags?: string[]
  ): Promise<void>;

  /**
   * Remove value from cache backend.
   *
   * @param key - cache key to remove
   * @returns Promise resolving when key is removed
   */
  protected abstract deleteValue(key: string): Promise<void>;

  /**
   * Clear all cache entries.
   *
   * @returns Promise resolving when cache is cleared
   */
  protected abstract clearCache(): Promise<void>;

  /**
   * Build full cache key with prefix and key generation logic.
   *
   * Override in subclasses for custom key generation patterns.
   *
   * @param key - base key
   * @returns full cache key string
   */
  protected buildKey(key: Key): string {
    const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
    return this.keyPrefix ? `${this.keyPrefix}:${keyStr}` : keyStr;
  }

  /**
   * Serialize value for storage.
   *
   * @param value - value to serialize
   * @param serialize - whether to serialize (override default)
   * @returns serialized value
   */
  protected serializeValue(value: Value, serialize?: boolean): any {
    const shouldSerialize = serialize ?? this.defaultSerialization;
    return shouldSerialize ? JSON.stringify(value) : value;
  }

  /**
   * Deserialize value from storage.
   *
   * @param value - stored value
   * @param serialize - whether value was serialized
   * @returns deserialized value
   */
  protected deserializeValue(value: any, serialize?: boolean): Value {
    const wasSerialized = serialize ?? this.defaultSerialization;
    if (!wasSerialized || value === null) return value;

    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as-is if parse fails
    }
  }

  /**
   * Get value from cache.
   *
   * @param key - cache key
   * @param options - cache options
   * @returns Promise resolving to cached value or null
   */
  async get(key: Key, options: CacheOptions = {}): Promise<Value | null> {
    const fullKey = this.buildKey(key);
    const rawValue = await this.getValue(fullKey);
    return this.deserializeValue(rawValue, options.serialize);
  }

  /**
   * Store value in cache.
   *
   * @param key - cache key
   * @param value - value to cache
   * @param options - cache options
   * @returns Promise resolving when cached
   */
  async set(key: Key, value: Value, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = options.ttl ?? this.defaultTTL;
    const serializedValue = this.serializeValue(value, options.serialize);

    await this.setValue(fullKey, serializedValue, ttl, options.tags);
  }

  /**
   * Remove value from cache.
   *
   * @param key - cache key to remove
   * @returns Promise resolving when removed
   */
  async del(key: Key): Promise<void> {
    const fullKey = this.buildKey(key);
    await this.deleteValue(fullKey);
  }

  /**
   * Cache-aside pattern: get from cache or compute and cache.
   *
   * If value exists in cache, return it. Otherwise, call fallback function,
   * cache the result, and return it.
   *
   * @param key - cache key
   * @param fallback - function to compute value if cache miss
   * @param options - cache options
   * @returns Promise resolving to cached or computed value
   */
  async getOrSet(
    key: Key,
    fallback: () => Promise<Value>,
    options: CacheOptions = {}
  ): Promise<Value> {
    const cached = await this.get(key, options);

    if (cached !== null) {
      return cached;
    }

    const computed = await fallback();
    await this.set(key, computed, options);
    return computed;
  }

  /**
   * Increment a numeric cache value atomically.
   *
   * Override in subclasses to implement atomic increment.
   * Default implementation uses get/set (not atomic).
   *
   * @param key - cache key
   * @param delta - amount to increment (default: 1)
   * @param options - cache options
   * @returns Promise resolving to new value
   */
  async increment(
    key: Key,
    delta: number = 1,
    options: CacheOptions = {}
  ): Promise<number> {
    const current = ((await this.get(key, options)) as number) || 0;
    const newValue = current + delta;
    await this.set(key, newValue as Value, options);
    return newValue;
  }

  /**
   * Decrement a numeric cache value atomically.
   *
   * @param key - cache key
   * @param delta - amount to decrement (default: 1)
   * @param options - cache options
   * @returns Promise resolving to new value
   */
  async decrement(
    key: Key,
    delta: number = 1,
    options: CacheOptions = {}
  ): Promise<number> {
    return this.increment(key, -delta, options);
  }

  /**
   * Invalidate cache entries by tags.
   *
   * Override in subclasses to implement tag-based invalidation.
   *
   * @param tags - array of tags to invalidate
   * @returns Promise resolving to number of keys invalidated
   */
  abstract invalidateByTags(tags: string[]): Promise<number>;

  /**
   * Check if key exists in cache.
   *
   * @param key - cache key to check
   * @returns Promise resolving to true if key exists
   */
  async exists(key: Key): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get multiple values at once.
   *
   * Override for batch optimization in subclasses.
   * Default implementation calls get() for each key.
   *
   * @param keys - array of cache keys
   * @param options - cache options
   * @returns Promise resolving to array of values (null for missing keys)
   */
  async getMultiple(
    keys: Key[],
    options: CacheOptions = {}
  ): Promise<(Value | null)[]> {
    const promises = keys.map((key) => this.get(key, options));
    return Promise.all(promises);
  }

  /**
   * Set multiple values at once.
   *
   * @param entries - array of key-value pairs to cache
   * @param options - cache options
   * @returns Promise resolving when all values are cached
   */
  async setMultiple(
    entries: Array<{ key: Key; value: Value }>,
    options: CacheOptions = {}
  ): Promise<void> {
    const promises = entries.map((entry) =>
      this.set(entry.key, entry.value, options)
    );
    await Promise.all(promises);
  }

  /**
   * Clear all cache entries (use with caution).
   *
   * @returns Promise resolving when cache is cleared
   */
  async clear(): Promise<void> {
    await this.clearCache();
  }
}

/**
 * Example usage:
 *
 * @Injectable()
 * export class RedisCacheService extends BaseCacheService<string, any> {
 *   protected readonly keyPrefix = 'myapp';
 *
 *   constructor(@Inject('REDIS_CLIENT') private redis: Redis) {
 *     super();
 *   }
 *
 *   protected async getValue(key: string): Promise<any> {
 *     return await this.redis.get(key);
 *   }
 *
 *   protected async setValue(key: string, value: any, ttlSeconds?: number, tags?: string[]) {
 *     if (ttlSeconds) {
 *       await this.redis.setex(key, ttlSeconds, value);
 *     } else {
 *       await this.redis.set(key, value);
 *     }
 *
 *     // Handle tags if supported
 *     if (tags?.length) {
 *       for (const tag of tags) {
 *         await this.redis.sadd(`tag:${tag}`, key);
 *       }
 *     }
 *   }
 * }
 */
