import { DeliveryOptions, StorageItem } from '../types';
import { Logger } from '../utilities/logger';
import { getMimeType } from '../utilities/format-utils';

export interface DeliveryResponse {
  buffer: Buffer;
  contentType: string;
  cacheControl: string;
  etag: string;
  lastModified: string;
  contentLength: number;
  headers: Record<string, string>;
}

export interface RangeRequest {
  start: number;
  end: number;
}

export interface AdaptiveBitrateConfig {
  qualities: {
    label: string;
    maxBitrate: number;
    width: number;
    height: number;
  }[];
}

export class MediaDelivery {
  private logger: Logger;
  private defaultOptions: DeliveryOptions;

  constructor(defaultOptions: DeliveryOptions = {}) {
    this.logger = new Logger('delivery');
    this.defaultOptions = {
      cacheControl: 'public, max-age=31536000',
      compress: true,
      ...defaultOptions,
    };
  }

  async deliver(
    item: StorageItem,
    buffer: Buffer,
    options: DeliveryOptions = {}
  ): Promise<DeliveryResponse> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    const contentType = getMimeType(item.metadata.format);
    const cacheControl = mergedOptions.cacheControl || 'public, max-age=31536000';
    const etag = `"${item.metadata.checksum.substring(0, 16)}"`;
    const lastModified = item.metadata.updatedAt.toUTCString();

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': cacheControl,
      'ETag': etag,
      'Last-Modified': lastModified,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
    };

    if (item.metadata.format === 'mp4' || item.metadata.format === 'webm') {
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Range';
    }

    return {
      buffer,
      contentType,
      cacheControl,
      etag,
      lastModified,
      contentLength: buffer.length,
      headers,
    };
  }

  handleRangeRequest(
    buffer: Buffer,
    range: RangeRequest
  ): { buffer: Buffer; start: number; end: number; total: number } {
    const total = buffer.length;
    const start = Math.max(0, range.start);
    const end = Math.min(total - 1, range.end);
    const slicedBuffer = buffer.slice(start, end + 1);

    return {
      buffer: slicedBuffer,
      start,
      end,
      total,
    };
  }

  parseRangeHeader(rangeHeader: string): RangeRequest | null {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) return null;

    return {
      start: parseInt(match[1], 10),
      end: match[2] ? parseInt(match[2], 10) : Infinity,
    };
  }

  getAdaptiveQuality(
    buffer: Buffer,
    networkSpeed: number,
    config: AdaptiveBitrateConfig
  ): { label: string; width: number; height: number; maxBitrate: number } {
    const qualities = config.qualities.sort((a, b) => b.maxBitrate - a.maxBitrate);

    for (const quality of qualities) {
      if (networkSpeed >= quality.maxBitrate * 1.2) {
        return quality;
      }
    }

    return qualities[qualities.length - 1];
  }

  generateCacheHeaders(
    item: StorageItem,
    options: { immutable?: boolean; maxAge?: number } = {}
  ): Record<string, string> {
    const maxAge = options.maxAge || 31536000;
    const cacheControl = options.immutable
      ? `public, max-age=${maxAge}, immutable`
      : `public, max-age=${maxAge}`;

    return {
      'Cache-Control': cacheControl,
      'ETag': `"${item.metadata.checksum.substring(0, 16)}"`,
      'Last-Modified': item.metadata.updatedAt.toUTCString(),
    };
  }

  optimizeForNetwork(
    buffer: Buffer,
    networkType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi'
  ): Buffer {
    const maxSizes: Record<string, number> = {
      'slow-2g': 50000,
      '2g': 100000,
      '3g': 300000,
      '4g': 1000000,
      'wifi': buffer.length,
    };

    const maxSize = maxSizes[networkType] || buffer.length;
    if (buffer.length <= maxSize) {
      return buffer;
    }

    this.logger.info('Network optimization applied', {
      originalSize: buffer.length,
      targetSize: maxSize,
      networkType,
    });

    return buffer.slice(0, maxSize);
  }
}
