import { MediaCache } from '../caching';
import { CacheOptions } from '../types';

describe('MediaCache', () => {
  let cache: MediaCache;

  beforeEach(() => {
    cache = new MediaCache({
      ttlSeconds: 60,
      storage: 'memory',
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', { data: 'test' });
      const result = await cache.get<{ data: string }>('key1');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle different value types', async () => {
      await cache.set('string', 'hello');
      await cache.set('number', 42);
      await cache.set('object', { nested: { value: true } });
      await cache.set('array', [1, 2, 3]);

      expect(await cache.get('string')).toBe('hello');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('object')).toEqual({ nested: { value: true } });
      expect(await cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new MediaCache({
        ttlSeconds: 1,
        storage: 'memory',
      });

      await shortCache.set('key1', 'value1');
      expect(await shortCache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await shortCache.get('key1')).toBeNull();
    });

    it('should allow custom TTL per entry', async () => {
      await cache.set('short', 'value', 1);
      await cache.set('long', 'value', 3600);

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(await cache.get('short')).toBeNull();
      expect(await cache.get('long')).toBe('value');
    });
  });

  describe('delete', () => {
    it('should delete entries', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.get('key1')).toBe('value1');

      await cache.delete('key1');
      expect(await cache.get('key1')).toBeNull();
    });

    it('should handle deleting non-existent entries', async () => {
      await expect(cache.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing entries', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent entries', async () => {
      expect(await cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', async () => {
      const shortCache = new MediaCache({
        ttlSeconds: 1,
        storage: 'memory',
      });

      await shortCache.set('key1', 'value1');
      expect(await shortCache.has('key1')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await shortCache.has('key1')).toBe(false);
    });
  });

  describe('stats', () => {
    it('should return correct stats', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', { data: 'test' });

      const stats = cache.getStats();
      expect(stats.count).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict LRU entries when max size exceeded', async () => {
      const smallCache = new MediaCache({
        ttlSeconds: 60,
        storage: 'memory',
        maxSizeBytes: 200,
      });

      await smallCache.set('key1', 'a'.repeat(50));
      await smallCache.set('key2', 'b'.repeat(50));
      await smallCache.set('key3', 'c'.repeat(50));
      await smallCache.set('key4', 'd'.repeat(50));

      await smallCache.get('key1');
      await smallCache.set('key5', 'e'.repeat(50));

      const stats = smallCache.getStats();
      expect(stats.count).toBeLessThanOrEqual(3);
    });
  });
});
