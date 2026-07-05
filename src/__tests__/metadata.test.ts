import { MetadataStore } from '../metadata';
import { MediaMetadata } from '../types';
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('MetadataStore', () => {
  let store: MetadataStore;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-test-'));
    store = new MetadataStore({ basePath: tempDir });
    await store.initialize();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const createMockMetadata = (id: string, overrides: Partial<MediaMetadata> = {}): MediaMetadata => ({
    id,
    originalName: `test-${id}.jpg`,
    format: 'jpeg',
    category: 'image',
    size: 1024,
    dimensions: { width: 100, height: 100 },
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    checksum: `checksum-${id}`,
    ...overrides,
  });

  describe('save and get', () => {
    it('should save and retrieve metadata', async () => {
      const metadata = createMockMetadata('test-1');
      await store.save(metadata);
      const retrieved = await store.get('test-1');
      expect(retrieved).toEqual(metadata);
    });

    it('should return null for non-existent IDs', async () => {
      const result = await store.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete metadata', async () => {
      const metadata = createMockMetadata('test-1');
      await store.save(metadata);
      await store.delete('test-1');
      const result = await store.get('test-1');
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.save(createMockMetadata('img-1', { category: 'image', tags: ['math', 'algebra'] }));
      await store.save(createMockMetadata('img-2', { category: 'image', tags: ['science'] }));
      await store.save(createMockMetadata('vid-1', { category: 'video', tags: ['math'] }));
      await store.save(createMockMetadata('aud-1', { category: 'audio', tags: ['english'] }));
    });

    it('should search by category', async () => {
      const result = await store.search({ category: 'image' });
      expect(result.total).toBe(2);
    });

    it('should search by tags', async () => {
      const result = await store.search({ tags: ['math'] });
      expect(result.total).toBe(2);
    });

    it('should search by multiple criteria', async () => {
      const result = await store.search({ category: 'image', tags: ['math'] });
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('img-1');
    });

    it('should support pagination', async () => {
      const result = await store.search({ limit: 2, offset: 0 });
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(4);
    });
  });

  describe('tags', () => {
    it('should add tags', async () => {
      const metadata = createMockMetadata('test-1', { tags: ['existing'] });
      await store.save(metadata);
      await store.addTag('test-1', 'new-tag');
      const retrieved = await store.get('test-1');
      expect(retrieved?.tags).toContain('new-tag');
    });

    it('should not add duplicate tags', async () => {
      const metadata = createMockMetadata('test-1', { tags: ['tag1'] });
      await store.save(metadata);
      await store.addTag('test-1', 'tag1');
      const retrieved = await store.get('test-1');
      expect(retrieved?.tags.filter(t => t === 'tag1').length).toBe(1);
    });

    it('should remove tags', async () => {
      const metadata = createMockMetadata('test-1', { tags: ['tag1', 'tag2'] });
      await store.save(metadata);
      await store.removeTag('test-1', 'tag1');
      const retrieved = await store.get('test-1');
      expect(retrieved?.tags).not.toContain('tag1');
      expect(retrieved?.tags).toContain('tag2');
    });

    it('should update all tags', async () => {
      const metadata = createMockMetadata('test-1', { tags: ['old'] });
      await store.save(metadata);
      await store.updateTags('test-1', ['new1', 'new2']);
      const retrieved = await store.get('test-1');
      expect(retrieved?.tags).toEqual(['new1', 'new2']);
    });
  });

  describe('stats', () => {
    it('should calculate correct stats', async () => {
      await store.save(createMockMetadata('img-1', { category: 'image', format: 'jpeg', size: 1000 }));
      await store.save(createMockMetadata('img-2', { category: 'image', format: 'png', size: 2000 }));
      await store.save(createMockMetadata('vid-1', { category: 'video', format: 'mp4', size: 5000 }));

      const stats = await store.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.totalSize).toBe(8000);
      expect(stats.byCategory.image.count).toBe(2);
      expect(stats.byCategory.video.count).toBe(1);
      expect(stats.byFormat.jpeg.count).toBe(1);
      expect(stats.byFormat.png.count).toBe(1);
    });
  });
});
