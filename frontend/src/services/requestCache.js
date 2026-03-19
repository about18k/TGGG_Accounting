const DEFAULT_TTL_MS = 30000;

const resolvedCache = new Map();
const inflightCache = new Map();

const stableSerialize = (value) => {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${encodeURIComponent(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }

  return String(value);
};

const removeExpiredEntries = (now = Date.now()) => {
  for (const [key, entry] of resolvedCache.entries()) {
    if (entry.expiresAt <= now) {
      resolvedCache.delete(key);
    }
  }
};

export const buildRequestCacheKey = (prefix, params) => {
  if (!params || (typeof params === 'object' && Object.keys(params).length === 0)) {
    return prefix;
  }
  return `${prefix}:${stableSerialize(params)}`;
};

export const withRequestCache = async ({ key, request, ttlMs = DEFAULT_TTL_MS, force = false }) => {
  if (typeof request !== 'function') {
    throw new Error('withRequestCache requires a request function');
  }

  const now = Date.now();
  removeExpiredEntries(now);

  if (!force) {
    const cachedEntry = resolvedCache.get(key);
    if (cachedEntry && cachedEntry.expiresAt > now) {
      return cachedEntry.value;
    }

    const inflightRequest = inflightCache.get(key);
    if (inflightRequest) {
      return inflightRequest;
    }
  }

  const requestPromise = Promise.resolve()
    .then(request)
    .then((value) => {
      if (ttlMs > 0) {
        resolvedCache.set(key, {
          value,
          expiresAt: Date.now() + ttlMs,
        });
      } else {
        resolvedCache.delete(key);
      }
      return value;
    })
    .finally(() => {
      inflightCache.delete(key);
    });

  if (!force) {
    inflightCache.set(key, requestPromise);
  }

  return requestPromise;
};

export const invalidateRequestCache = (prefixOrKey, { exact = false } = {}) => {
  if (!prefixOrKey) return;

  const shouldDelete = (key) => (exact ? key === prefixOrKey : key.startsWith(prefixOrKey));

  for (const key of resolvedCache.keys()) {
    if (shouldDelete(key)) {
      resolvedCache.delete(key);
    }
  }

  for (const key of inflightCache.keys()) {
    if (shouldDelete(key)) {
      inflightCache.delete(key);
    }
  }
};

export const clearRequestCache = () => {
  resolvedCache.clear();
  inflightCache.clear();
};
