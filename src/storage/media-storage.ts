import {
  StorageItem,
  MediaMetadata,
  MediaFormat,
  MediaCategory,
  StorageConfig,
} from '../types';
import { NotFoundError, StorageError, ValidationError } from '../errors';
import { Logger } from '../utilities/logger';
import { generateId, calculateChecksum, getFormatFromFilename, getCategoryForFormat } from '../utilities/format-utils';
import { generateStoragePath, ensureDir, fileExists, deleteFile, copyFile, getFileSize } from '../utilities/file-utils';
import { validateId } from '../utilities/validators';

const fs = require('fs').promises;
const path = require('path');

export class MediaStorage {
  private config: StorageConfig;
  private logger: Logger;
  private index: Map<string, StorageItem>;

  constructor(config: StorageConfig) {
    this.config = config;
    this.logger = new Logger('storage');
    this.index = new Map();
  }

  async initialize(): Promise<void> {
    await ensureDir(this.config.basePath);
    await ensureDir(this.config.tempPath);
    await this.loadIndex();
    this.logger.info('Storage initialized', { basePath: this.config.basePath });
  }

  async store(
    buffer: Buffer,
    filename: string,
    options: {
      lessonId?: string;
      schoolId?: string;
      tags?: string[];
      custom?: Record<string, unknown>;
    } = {}
  ): Promise<StorageItem> {
    const format = getFormatFromFilename(filename);
    if (!format) {
      throw new ValidationError(`Cannot determine format from filename: ${filename}`);
    }

    const category = getCategoryForFormat(format);
    this.validateFormat(format);

    const id = generateId();
    const checksum = calculateChecksum(buffer);
    const filePath = generateStoragePath(this.config.basePath, category, id, format);

    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, buffer);

    const now = new Date();
    const metadata: MediaMetadata = {
      id,
      originalName: filename,
      format,
      category,
      size: buffer.length,
      dimensions: {},
      createdAt: now,
      updatedAt: now,
      tags: options.tags || [],
      lessonId: options.lessonId,
      schoolId: options.schoolId,
      checksum,
      custom: options.custom,
    };

    const item: StorageItem = {
      id,
      metadata,
      path: filePath,
      url: `/media/${category}/${id}.${format}`,
    };

    this.index.set(id, item);
    await this.saveIndex();

    this.logger.info('Media stored', { id, format, category, size: buffer.length });
    return item;
  }

  async get(id: string): Promise<StorageItem> {
    validateId(id);
    const item = this.index.get(id);
    if (!item) {
      throw new NotFoundError(`Media not found: ${id}`);
    }
    return item;
  }

  async getBuffer(id: string): Promise<Buffer> {
    const item = await this.get(id);
    if (!await fileExists(item.path)) {
      throw new StorageError(`Media file missing from disk: ${id}`);
    }
    return fs.readFile(item.path);
  }

  async exists(id: string): Promise<boolean> {
    return this.index.has(id);
  }

  async delete(id: string): Promise<void> {
    validateId(id);
    const item = this.index.get(id);
    if (!item) {
      throw new NotFoundError(`Media not found: ${id}`);
    }

    await deleteFile(item.path);

    if (item.variants) {
      for (const variant of item.variants) {
        await deleteFile(variant.path);
      }
    }

    this.index.delete(id);
    await this.saveIndex();
    this.logger.info('Media deleted', { id });
  }

  async list(options: {
    category?: MediaCategory;
    lessonId?: string;
    schoolId?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: StorageItem[]; total: number }> {
    let items = Array.from(this.index.values());

    if (options.category) {
      items = items.filter(item => item.metadata.category === options.category);
    }
    if (options.lessonId) {
      items = items.filter(item => item.metadata.lessonId === options.lessonId);
    }
    if (options.schoolId) {
      items = items.filter(item => item.metadata.schoolId === options.schoolId);
    }
    if (options.tags && options.tags.length > 0) {
      items = items.filter(item =>
        options.tags!.some(tag => item.metadata.tags.includes(tag))
      );
    }

    const total = items.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    items = items.slice(offset, offset + limit);

    return { items, total };
  }

  async addVariant(parentId: string, variant: StorageItem): Promise<void> {
    const parent = await this.get(parentId);
    if (!parent.variants) {
      parent.variants = [];
    }
    variant.parentId = parentId;
    parent.variants.push(variant);
    this.index.set(parentId, parent);
    this.index.set(variant.id, variant);
    await this.saveIndex();
  }

  async copy(id: string, destination: string): Promise<StorageItem> {
    const item = await this.get(id);
    const format = item.metadata.format;
    const category = item.metadata.category;
    const newId = generateId();
    const newPath = generateStoragePath(this.config.basePath, category, newId, format);

    await ensureDir(path.dirname(newPath));
    await copyFile(item.path, newPath);

    const now = new Date();
    const newItem: StorageItem = {
      id: newId,
      metadata: {
        ...item.metadata,
        id: newId,
        createdAt: now,
        updatedAt: now,
      },
      path: newPath,
      url: `/media/${category}/${newId}.${format}`,
    };

    this.index.set(newId, newItem);
    await this.saveIndex();

    this.logger.info('Media copied', { sourceId: id, newId });
    return newItem;
  }

  async getStorageStats(): Promise<{
    totalItems: number;
    totalSize: number;
    byCategory: Record<MediaCategory, { count: number; size: number }>;
  }> {
    const items = Array.from(this.index.values());
    const stats = {
      totalItems: items.length,
      totalSize: 0,
      byCategory: {
        image: { count: 0, size: 0 },
        video: { count: 0, size: 0 },
        audio: { count: 0, size: 0 },
      },
    };

    for (const item of items) {
      stats.totalSize += item.metadata.size;
      stats.byCategory[item.metadata.category].count++;
      stats.byCategory[item.metadata.category].size += item.metadata.size;
    }

    return stats;
  }

  private validateFormat(format: MediaFormat): void {
    if (!this.config.allowedFormats.includes(format)) {
      throw new ValidationError(`Format ${format} is not allowed`);
    }
  }

  private async loadIndex(): Promise<void> {
    const indexPath = path.join(this.config.basePath, '.index.json');
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      const entries = JSON.parse(data) as [string, StorageItem][];
      this.index = new Map(entries);
      this.logger.debug(`Loaded ${this.index.size} items from index`);
    } catch {
      this.index = new Map();
    }
  }

  private async saveIndex(): Promise<void> {
    const indexPath = path.join(this.config.basePath, '.index.json');
    const entries = Array.from(this.index.entries());
    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2));
  }
}
