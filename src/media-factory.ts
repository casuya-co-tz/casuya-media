import {
  MediaFactoryConfig,
  MediaFormat,
  MediaCategory,
  MediaMetadata,
  ProcessingOptions,
  ThumbnailOptions,
  ThumbnailResult,
  StorageItem,
  DeliveryOptions,
  StreamingOptions,
  StreamingQuality,
} from './types';
import { MediaStorage } from './storage';
import { ImageProcessingPipeline } from './image-processing';
import { VideoProcessingPipeline, VideoProcessingPipelineOptions } from './video-processing';
import { AudioProcessingPipeline, AudioProcessingPipelineOptions } from './audio-processing';
import { MediaDelivery, DeliveryResponse } from './delivery';
import { MediaCache } from './caching';
import { MetadataStore, MetadataSearchOptions } from './metadata';
import { Logger, LogLevel } from './utilities/logger';
import { generateId, getFormatFromFilename, getCategoryForFormat } from './utilities/format-utils';
import { validateId, validateFormat } from './utilities/validators';

const path = require('path');

const DEFAULT_CONFIG: MediaFactoryConfig = {
  storage: {
    basePath: './media',
    tempPath: './media/temp',
    maxFileSize: 100 * 1024 * 1024,
    allowedFormats: ['jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'tiff', 'mp4', 'webm', 'ogv', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
  },
  cache: {
    ttlSeconds: 3600,
    storage: 'memory',
  },
  delivery: {
    cacheControl: 'public, max-age=31536000',
    compress: true,
  },
  processing: {
    maxConcurrent: 3,
    timeout: 30000,
    tempDir: './media/temp',
  },
};

export class MediaFactory {
  private config: MediaFactoryConfig;
  private storage: MediaStorage;
  private imagePipeline: ImageProcessingPipeline;
  private videoPipeline: VideoProcessingPipeline;
  private audioPipeline: AudioProcessingPipeline;
  private delivery: MediaDelivery;
  private cache: MediaCache;
  private metadataStore: MetadataStore;
  private logger: Logger;
  private initialized: boolean;

  constructor(config: Partial<MediaFactoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger('MediaFactory');
    this.initialized = false;

    this.storage = new MediaStorage(this.config.storage);
    this.cache = new MediaCache(this.config.cache);
    this.delivery = new MediaDelivery(this.config.delivery);
    this.metadataStore = new MetadataStore({
      basePath: this.config.storage.basePath,
    });

    this.imagePipeline = new ImageProcessingPipeline({
      thumbnailOutputDir: path.join(this.config.storage.basePath, 'thumbnails'),
      autoOptimize: true,
    });

    this.videoPipeline = new VideoProcessingPipeline({
      tempDir: this.config.processing.tempDir,
      thumbnailOutputDir: path.join(this.config.storage.basePath, 'thumbnails'),
      hlsOutputDir: path.join(this.config.storage.basePath, 'hls'),
    });

    this.audioPipeline = new AudioProcessingPipeline({
      tempDir: this.config.processing.tempDir,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.storage.initialize();
    await this.cache.initialize();
    await this.metadataStore.initialize();

    this.initialized = true;
    this.logger.info('MediaFactory initialized');
  }

  async upload(
    buffer: Buffer,
    filename: string,
    options: {
      lessonId?: string;
      schoolId?: string;
      tags?: string[];
      process?: boolean;
      processingOptions?: ProcessingOptions;
    } = {}
  ): Promise<StorageItem> {
    await this.ensureInitialized();

    const format = getFormatFromFilename(filename);
    if (!format) {
      throw new Error(`Cannot determine format from filename: ${filename}`);
    }

    const category = getCategoryForFormat(format);

    let processedBuffer = buffer;

    if (options.process) {
      processedBuffer = await this.processBuffer(buffer, category, options.processingOptions || {});
    }

    const item = await this.storage.store(processedBuffer, filename, {
      lessonId: options.lessonId,
      schoolId: options.schoolId,
      tags: options.tags,
    });

    await this.metadataStore.save(item.metadata);
    await this.cache.set(`media:${item.id}`, item, 86400);

    this.logger.info('Media uploaded', {
      id: item.id,
      format,
      category,
      size: buffer.length,
      processedSize: processedBuffer.length,
    });

    return item;
  }

  async get(id: string): Promise<StorageItem> {
    await this.ensureInitialized();
    validateId(id);

    const cached = await this.cache.get<StorageItem>(`media:${id}`);
    if (cached) return cached;

    const item = await this.storage.get(id);
    await this.cache.set(`media:${id}`, item, 86400);
    return item;
  }

  async getBuffer(id: string): Promise<Buffer> {
    await this.ensureInitialized();
    validateId(id);

    const cached = await this.cache.get<Buffer>(`buffer:${id}`);
    if (cached) return cached;

    const buffer = await this.storage.getBuffer(id);
    await this.cache.set(`buffer:${id}`, buffer, 3600);
    return buffer;
  }

  async deliver(id: string, options: DeliveryOptions = {}): Promise<DeliveryResponse> {
    const item = await this.get(id);
    const buffer = await this.getBuffer(id);
    return this.delivery.deliver(item, buffer, options);
  }

  async processImage(
    id: string,
    options: ProcessingOptions = {}
  ): Promise<StorageItem> {
    await this.ensureInitialized();
    const buffer = await this.getBuffer(id);
    const result = await this.imagePipeline.process(buffer, options);

    const item = await this.storage.store(result.buffer, `processed-${id}.webp`, {
      tags: ['processed', 'image'],
    });

    await this.metadataStore.save(item.metadata);
    return item;
  }

  async processVideo(
    id: string,
    options: ProcessingOptions = {}
  ): Promise<StorageItem> {
    await this.ensureInitialized();
    const tempPath = path.join(this.config.processing.tempDir, `temp-${id}`);
    const buffer = await this.getBuffer(id);
    const fs = require('fs').promises;
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, buffer);

    try {
      const result = await this.videoPipeline.process(tempPath, options);
      const processedBuffer = await fs.readFile(result.outputPath);

      const item = await this.storage.store(processedBuffer, `processed-${id}.mp4`, {
        tags: ['processed', 'video'],
      });

      await this.metadataStore.save(item.metadata);
      return item;
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  async processAudio(
    id: string,
    options: ProcessingOptions = {}
  ): Promise<StorageItem> {
    await this.ensureInitialized();
    const tempPath = path.join(this.config.processing.tempDir, `temp-${id}`);
    const buffer = await this.getBuffer(id);
    const fs = require('fs').promises;
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, buffer);

    try {
      const result = await this.audioPipeline.process(tempPath, options);
      const processedBuffer = await fs.readFile(result.outputPath);

      const item = await this.storage.store(processedBuffer, `processed-${id}.mp3`, {
        tags: ['processed', 'audio'],
      });

      await this.metadataStore.save(item.metadata);
      return item;
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  async generateThumbnail(
    id: string,
    options: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    await this.ensureInitialized();
    const item = await this.get(id);
    const buffer = await this.getBuffer(id);

    if (item.metadata.category === 'image') {
      const result = await this.imagePipeline.process(buffer, {
        width: options.width,
        height: options.height,
        quality: options.quality,
      });
      return {
        path: `thumbnail-${id}.${options.format || 'webp'}`,
        width: options.width,
        height: options.height,
        format: options.format || 'webp',
        size: result.buffer.length,
      };
    }

    throw new Error(`Thumbnail generation not supported for category: ${item.metadata.category}`);
  }

  async createHls(
    id: string,
    qualities?: StreamingQuality[]
  ): Promise<string> {
    await this.ensureInitialized();
    const tempPath = path.join(this.config.processing.tempDir, `temp-${id}`);
    const buffer = await this.getBuffer(id);
    const fs = require('fs').promises;
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, buffer);

    try {
      const playlists = await this.videoPipeline.createHls(tempPath, qualities);
      return playlists[0]?.path || '';
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    validateId(id);

    await this.storage.delete(id);
    await this.metadataStore.delete(id);
    await this.cache.delete(`media:${id}`);
    await this.cache.delete(`buffer:${id}`);

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
    await this.ensureInitialized();
    return this.storage.list(options);
  }

  async search(options: MetadataSearchOptions): Promise<{
    items: MediaMetadata[];
    total: number;
  }> {
    await this.ensureInitialized();
    return this.metadataStore.search(options);
  }

  async getStats(): Promise<{
    storage: {
      totalItems: number;
      totalSize: number;
      byCategory: Record<MediaCategory, { count: number; size: number }>;
    };
    cache: {
      size: number;
      count: number;
    };
    metadata: {
      totalItems: number;
      totalSize: number;
    };
  }> {
    await this.ensureInitialized();

    const [storageStats, cacheStats, metadataStats] = await Promise.all([
      this.storage.getStorageStats(),
      Promise.resolve(this.cache.getStats()),
      this.metadataStore.getStats(),
    ]);

    return {
      storage: storageStats,
      cache: { size: cacheStats.size, count: cacheStats.count },
      metadata: { totalItems: metadataStats.totalItems, totalSize: metadataStats.totalSize },
    };
  }

  async optimizeForNetwork(
    id: string,
    networkType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi'
  ): Promise<Buffer> {
    const buffer = await this.getBuffer(id);
    return this.delivery.optimizeForNetwork(buffer, networkType);
  }

  setLogLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }

  private async processBuffer(
    buffer: Buffer,
    category: MediaCategory,
    options: ProcessingOptions
  ): Promise<Buffer> {
    switch (category) {
      case 'image': {
        const result = await this.imagePipeline.process(buffer, options);
        return result.buffer;
      }
      case 'video': {
        const tempPath = path.join(this.config.processing.tempDir, `proc-${generateId()}`);
        const fs = require('fs').promises;
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, buffer);
        try {
          const result = await this.videoPipeline.process(tempPath, options);
          return await fs.readFile(result.outputPath);
        } finally {
          await fs.unlink(tempPath).catch(() => {});
        }
      }
      case 'audio': {
        const tempPath = path.join(this.config.processing.tempDir, `proc-${generateId()}`);
        const fs = require('fs').promises;
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, buffer);
        try {
          const result = await this.audioPipeline.process(tempPath, options);
          return await fs.readFile(result.outputPath);
        } finally {
          await fs.unlink(tempPath).catch(() => {});
        }
      }
      default:
        return buffer;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export default MediaFactory;
