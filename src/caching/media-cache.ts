import { CacheOptions, CacheEntry } from '../types';
import { CacheError } from '../errors';
import { Logger } from '../utilities/logger';

const fs = require('fs').promises;
const path = require('path');

export class MediaCache {
  private options: CacheOptions;
  private logger: Logger;
  private memoryCache: Map<string, CacheEntry>;
  private accessOrder: string[];
  private currentSize: number;

  constructor(options: CacheOptions) {
    this.options = options;
    this.logger = new Logger('caching');
    this.memoryCache = new Map();
    this.accessOrder = [];
    this.currentSize = 0;
  }

  async initialize(): Promise<void> {
    if (this.options.storage === 'disk' && this.options.diskPath) {
      await fs.mkdir(this.options.diskPath, { recursive: true });
      await this.loadDiskCache();
    }
    this.logger.info('Cache initialized', {
      storage: this.options.storage,
      ttl: this.options.ttlSeconds,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      if (this.options.storage === 'disk') {
        return this.getFromDisk<T>(key);
      }
      return null;
    }

    if (new Date() > entry.expiresAt) {
      await this.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    this.updateAccessOrder(key);

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.options.ttlSeconds;
    const size = this.estimateSize(value);

    if (this.options.maxSizeBytes && this.currentSize + size > this.options.maxSizeBytes) {
      await this.evict(size);
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      size,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000),
      accessCount: 0,
      lastAccessedAt: new Date(),
    };

    this.memoryCache.set(key, entry);
    this.currentSize += size;
    this.updateAccessOrder(key);

    if (this.options.storage === 'disk') {
      await this.saveToDisk(key, entry);
    }
  }

  async delete(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.memoryCache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }

    if (this.options.storage === 'disk' && this.options.diskPath) {
      const filePath = path.join(this.options.diskPath, `${key}.json`);
      try {
        await fs.unlink(filePath);
      } catch {
        // File may not exist
      }
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessOrder = [];
    this.currentSize = 0;

    if (this.options.storage === 'disk' && this.options.diskPath) {
      const files = await fs.readdir(this.options.diskPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.options.diskPath, file));
        }
      }
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;
    if (new Date() > entry.expiresAt) {
      await this.delete(key);
      return false;
    }
    return true;
  }

  getStats(): {
    size: number;
    count: number;
    hitRate: number;
    totalAccessCount: number;
  } {
    let totalAccessCount = 0;
    for (const entry of this.memoryCache.values()) {
      totalAccessCount += entry.accessCount;
    }

    return {
      size: this.currentSize,
      count: this.memoryCache.size,
      hitRate: 0,
      totalAccessCount,
    };
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  private async evict(neededSpace: number): Promise<void> {
    while (
      this.currentSize + neededSpace > (this.options.maxSizeBytes || Infinity) &&
      this.accessOrder.length > 0
    ) {
      const lruKey = this.accessOrder.shift()!;
      const entry = this.memoryCache.get(lruKey);
      if (entry) {
        this.currentSize -= entry.size;
        this.memoryCache.delete(lruKey);
        this.logger.debug('Cache entry evicted', { key: lruKey, size: entry.size });
      }
    }
  }

  private estimateSize(value: unknown): number {
    const str = JSON.stringify(value);
    return Buffer.byteLength(str, 'utf-8');
  }

  private async getFromDisk<T>(key: string): Promise<T | null> {
    if (!this.options.diskPath) return null;

    const filePath = path.join(this.options.diskPath, `${key}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(data);
      entry.expiresAt = new Date(entry.expiresAt);

      if (new Date() > entry.expiresAt) {
        await this.delete(key);
        return null;
      }

      this.memoryCache.set(key, entry as CacheEntry);
      this.currentSize += entry.size;
      this.updateAccessOrder(key);

      return entry.value;
    } catch {
      return null;
    }
  }

  private async saveToDisk(key: string, entry: CacheEntry): Promise<void> {
    if (!this.options.diskPath) return;

    const filePath = path.join(this.options.diskPath, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry));
  }

  private async loadDiskCache(): Promise<void> {
    if (!this.options.diskPath) return;

    try {
      const files = await fs.readdir(this.options.diskPath);
      let loadedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.options.diskPath, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(data);
          entry.expiresAt = new Date(entry.expiresAt);

          if (new Date() <= entry.expiresAt) {
            const key = file.replace('.json', '');
            this.memoryCache.set(key, entry);
            this.currentSize += entry.size;
            this.accessOrder.push(key);
            loadedCount++;
          } else {
            await fs.unlink(filePath);
          }
        } catch {
          // Skip invalid files
        }
      }

      this.logger.info(`Loaded ${loadedCount} entries from disk cache`);
    } catch {
      // Directory may not exist yet
    }
  }
}
