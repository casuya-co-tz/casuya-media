import { MediaDelivery } from '../delivery';
import { StorageItem, MediaMetadata } from '../types';

describe('MediaDelivery', () => {
  let delivery: MediaDelivery;

  beforeEach(() => {
    delivery = new MediaDelivery();
  });

  const createMockItem = (format: string = 'jpeg'): StorageItem => ({
    id: 'test-id',
    metadata: {
      id: 'test-id',
      originalName: 'test.jpg',
      format: format as any,
      category: 'image',
      size: 1024,
      dimensions: { width: 100, height: 100 },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      checksum: 'abc123def456',
    },
    path: '/media/image/test-id.jpeg',
    url: '/media/image/test-id.jpeg',
  });

  describe('deliver', () => {
    it('should create delivery response with correct headers', async () => {
      const item = createMockItem();
      const buffer = Buffer.from('test data');

      const response = await delivery.deliver(item, buffer);

      expect(response.contentType).toBe('image/jpeg');
      expect(response.contentLength).toBe(9);
      expect(response.buffer).toBe(buffer);
      expect(response.cacheControl).toBe('public, max-age=31536000');
      expect(response.headers['Content-Type']).toBe('image/jpeg');
      expect(response.headers['Accept-Ranges']).toBe('bytes');
      expect(response.headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should include CORS headers for video formats', async () => {
      const item = createMockItem('mp4');
      const buffer = Buffer.from('test data');

      const response = await delivery.deliver(item, buffer);

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, HEAD, OPTIONS');
    });
  });

  describe('handleRangeRequest', () => {
    it('should handle range requests correctly', () => {
      const buffer = Buffer.from('0123456789');

      const result = delivery.handleRangeRequest(buffer, { start: 2, end: 5 });

      expect(result.buffer.toString()).toBe('2345');
      expect(result.start).toBe(2);
      expect(result.end).toBe(5);
      expect(result.total).toBe(10);
    });

    it('should handle start only ranges', () => {
      const buffer = Buffer.from('0123456789');

      const result = delivery.handleRangeRequest(buffer, { start: 7, end: Infinity });

      expect(result.buffer.toString()).toBe('789');
      expect(result.start).toBe(7);
      expect(result.end).toBe(9);
    });

    it('should clamp end to buffer length', () => {
      const buffer = Buffer.from('0123456789');

      const result = delivery.handleRangeRequest(buffer, { start: 5, end: 20 });

      expect(result.buffer.toString()).toBe('56789');
      expect(result.end).toBe(9);
    });
  });

  describe('parseRangeHeader', () => {
    it('should parse range headers correctly', () => {
      expect(delivery.parseRangeHeader('bytes=0-499')).toEqual({ start: 0, end: 499 });
      expect(delivery.parseRangeHeader('bytes=500-999')).toEqual({ start: 500, end: 999 });
      expect(delivery.parseRangeHeader('bytes=500-')).toEqual({ start: 500, end: Infinity });
    });

    it('should return null for invalid range headers', () => {
      expect(delivery.parseRangeHeader('invalid')).toBeNull();
      expect(delivery.parseRangeHeader('')).toBeNull();
    });
  });

  describe('getAdaptiveQuality', () => {
    it('should select appropriate quality based on network speed', () => {
      const config = {
        qualities: [
          { label: 'low', maxBitrate: 400000, width: 426, height: 240 },
          { label: 'medium', maxBitrate: 800000, width: 640, height: 360 },
          { label: 'high', maxBitrate: 2500000, width: 1280, height: 720 },
        ],
      };

      const buffer = Buffer.from('test');

      expect(delivery.getAdaptiveQuality(buffer, 1000000, config).label).toBe('medium');
      expect(delivery.getAdaptiveQuality(buffer, 3000000, config).label).toBe('high');
      expect(delivery.getAdaptiveQuality(buffer, 100000, config).label).toBe('low');
    });
  });

  describe('generateCacheHeaders', () => {
    it('should generate correct cache headers', () => {
      const item = createMockItem();
      const headers = delivery.generateCacheHeaders(item);

      expect(headers['Cache-Control']).toBe('public, max-age=31536000');
      expect(headers['ETag']).toContain('abc123');
      expect(headers['Last-Modified']).toBeDefined();
    });

    it('should support immutable caching', () => {
      const item = createMockItem();
      const headers = delivery.generateCacheHeaders(item, { immutable: true });

      expect(headers['Cache-Control']).toContain('immutable');
    });
  });

  describe('optimizeForNetwork', () => {
    it('should return full buffer for wifi', () => {
      const buffer = Buffer.alloc(1000000);
      const result = delivery.optimizeForNetwork(buffer, 'wifi');
      expect(result.length).toBe(buffer.length);
    });

    it('should truncate buffer for slow networks', () => {
      const buffer = Buffer.alloc(1000000);
      const result = delivery.optimizeForNetwork(buffer, '2g');
      expect(result.length).toBeLessThanOrEqual(100000);
    });
  });
});
