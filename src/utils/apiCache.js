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

/**
 * Approval cache refresh helper.
 *
 * Call this AFTER any mutation that creates a new pending approval
 * (design upload, drawing status → Pending/Revision, payment request,
 * material request, labour rate, RA bill, WO amendment, etc.). It:
 *   1. Drops the stale frontend snapshots (approval-drawer + approval-counts).
 *   2. Pre-warms a fresh /approvals/counts in the background so the badge
 *      number updates immediately and the drawer opens instantly when
 *      the user next clicks it.
 *
 * The fetch is fire-and-forget — never throws, never blocks the caller.
 * If the network call fails we just leave the cache empty and the next
 * drawer open will refetch from scratch (current behaviour).
 *
 * IMPORTANT: this is imported lazily inside the function so apiCache.js
 * doesn't carry a hard dep on config/api.js (would create a cycle).
 */
apiCache.refreshApprovals = async () => {
  apiCache.invalidate("approval-drawer");
  apiCache.invalidate("approval-counts");
  try {
    const { default: api } = await import("../config/api");
    const r = await api.get("/approvals/counts");
    if (r && r.success && r.data) {
      const byMod = r.data.byModule || [];
      const mrCount = byMod.find(m => m.module === "Material Request")?.count || 0;
      const prCount = byMod.find(m => m.module === "Payment Request")?.count || 0;
      const total   = r.data.total || 0;
      apiCache.set("approval-counts", { mrCount, prCount, total }, 60 * 1000);
    }
  } catch (_) { /* fire-and-forget */ }
};

export default apiCache;
