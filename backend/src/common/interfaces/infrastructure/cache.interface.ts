export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for bulk invalidation
  serialize?: boolean; // Whether to JSON serialize/deserialize
}
