// ============================================================
// apiCache.js — Global In-Memory API Cache
// Place at: src/utils/apiCache.js
// ============================================================

const cache = {};

const DEFAULT_TTL = 60 * 1000; // 60 seconds

const apiCache = {
  /**
   * Get cached value. Returns null if expired or not found.
   */
  get(key) {
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete cache[key];
      return null;
    }
    return entry.data;
  },

  /**
   * Set a value in cache with optional TTL (ms).
   */
  set(key, data, ttl = DEFAULT_TTL) {
    cache[key] = {
      data,
      expiresAt: Date.now() + ttl,
    };
  },

  /**
   * Manually invalidate a cache key or pattern.
   * Pass full key to delete one, or prefix to delete all matching.
   * e.g. apiCache.invalidate('projects') deletes all keys starting with 'projects'
   */
  invalidate(keyOrPrefix) {
    Object.keys(cache).forEach((k) => {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        delete cache[k];
      }
    });
  },

  /**
   * Clear entire cache (e.g. on logout).
   */
  clear() {
    Object.keys(cache).forEach((k) => delete cache[k]);
  },
};

export default apiCache;
