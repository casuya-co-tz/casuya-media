import { MediaMetadata, MediaCategory, MediaFormat } from '../types';
import { Logger } from '../utilities/logger';

export interface MetadataStorageOptions {
  basePath: string;
  indexFileName?: string;
}

export interface MetadataSearchOptions {
  category?: MediaCategory;
  format?: MediaFormat;
  tags?: string[];
  lessonId?: string;
  schoolId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export class MetadataStore {
  private metadata: Map<string, MediaMetadata>;
  private logger: Logger;
  private options: MetadataStorageOptions;

  constructor(options: MetadataStorageOptions) {
    this.options = options;
    this.metadata = new Map();
    this.logger = new Logger('metadata');
  }

  async initialize(): Promise<void> {
    await this.loadIndex();
    this.logger.info('Metadata store initialized', { count: this.metadata.size });
  }

  async save(metadata: MediaMetadata): Promise<void> {
    this.metadata.set(metadata.id, metadata);
    await this.saveIndex();
  }

  async get(id: string): Promise<MediaMetadata | null> {
    return this.metadata.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.metadata.delete(id);
    await this.saveIndex();
  }

  async search(options: MetadataSearchOptions = {}): Promise<{
    items: MediaMetadata[];
    total: number;
  }> {
    let items = Array.from(this.metadata.values());

    if (options.category) {
      items = items.filter(m => m.category === options.category);
    }
    if (options.format) {
      items = items.filter(m => m.format === options.format);
    }
    if (options.tags && options.tags.length > 0) {
      items = items.filter(m =>
        options.tags!.some(tag => m.tags.includes(tag))
      );
    }
    if (options.lessonId) {
      items = items.filter(m => m.lessonId === options.lessonId);
    }
    if (options.schoolId) {
      items = items.filter(m => m.schoolId === options.schoolId);
    }
    if (options.createdAfter) {
      items = items.filter(m => m.createdAt >= options.createdAfter!);
    }
    if (options.createdBefore) {
      items = items.filter(m => m.createdAt <= options.createdBefore!);
    }

    const total = items.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    items = items.slice(offset, offset + limit);

    return { items, total };
  }

  async getByLesson(lessonId: string): Promise<MediaMetadata[]> {
    return this.search({ lessonId }).then(r => r.items);
  }

  async getBySchool(schoolId: string): Promise<MediaMetadata[]> {
    return this.search({ schoolId }).then(r => r.items);
  }

  async getByCategory(category: MediaCategory): Promise<MediaMetadata[]> {
    return this.search({ category }).then(r => r.items);
  }

  async getStats(): Promise<{
    totalItems: number;
    totalSize: number;
    byCategory: Record<MediaCategory, { count: number; size: number }>;
    byFormat: Record<string, { count: number; size: number }>;
  }> {
    const items = Array.from(this.metadata.values());
    const stats = {
      totalItems: items.length,
      totalSize: 0,
      byCategory: {
        image: { count: 0, size: 0 },
        video: { count: 0, size: 0 },
        audio: { count: 0, size: 0 },
      } as Record<MediaCategory, { count: number; size: number }>,
      byFormat: {} as Record<string, { count: number; size: number }>,
    };

    for (const item of items) {
      stats.totalSize += item.size;
      stats.byCategory[item.category].count++;
      stats.byCategory[item.category].size += item.size;

      if (!stats.byFormat[item.format]) {
        stats.byFormat[item.format] = { count: 0, size: 0 };
      }
      stats.byFormat[item.format].count++;
      stats.byFormat[item.format].size += item.size;
    }

    return stats;
  }

  async updateTags(id: string, tags: string[]): Promise<void> {
    const metadata = this.metadata.get(id);
    if (metadata) {
      metadata.tags = tags;
      metadata.updatedAt = new Date();
      await this.saveIndex();
    }
  }

  async addTag(id: string, tag: string): Promise<void> {
    const metadata = this.metadata.get(id);
    if (metadata && !metadata.tags.includes(tag)) {
      metadata.tags.push(tag);
      metadata.updatedAt = new Date();
      await this.saveIndex();
    }
  }

  async removeTag(id: string, tag: string): Promise<void> {
    const metadata = this.metadata.get(id);
    if (metadata) {
      metadata.tags = metadata.tags.filter(t => t !== tag);
      metadata.updatedAt = new Date();
      await this.saveIndex();
    }
  }

  private async loadIndex(): Promise<void> {
    const fs = require('fs').promises;
    const indexPath = this.getIndexPath();
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      const entries = JSON.parse(data) as [string, MediaMetadata][];
      this.metadata = new Map(entries);
    } catch {
      this.metadata = new Map();
    }
  }

  private async saveIndex(): Promise<void> {
    const fs = require('fs').promises;
    const indexPath = this.getIndexPath();
    const entries = Array.from(this.metadata.entries());
    await fs.mkdir(require('path').dirname(indexPath), { recursive: true });
    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2));
  }

  private getIndexPath(): string {
    return require('path').join(
      this.options.basePath,
      this.options.indexFileName || '.metadata-index.json'
    );
  }
}
