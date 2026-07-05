export type MediaCategory = 'image' | 'video' | 'audio';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg' | 'bmp' | 'tiff';
export type VideoFormat = 'mp4' | 'webm' | 'ogv' | 'avi' | 'mov' | 'mkv';
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac' | 'flac' | 'm4a' | 'wma';

export type MediaFormat = ImageFormat | VideoFormat | AudioFormat;

export interface MediaDimensions {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
}

export interface MediaMetadata {
  id: string;
  originalName: string;
  format: MediaFormat;
  category: MediaCategory;
  size: number;
  dimensions: MediaDimensions;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  lessonId?: string;
  schoolId?: string;
  checksum: string;
  custom?: Record<string, unknown>;
}

export interface StorageItem {
  id: string;
  metadata: MediaMetadata;
  path: string;
  url?: string;
  variants?: StorageItem[];
  parentId?: string;
}

export interface ProcessingOptions {
  quality?: number;
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: MediaFormat;
  compression?: CompressionOptions;
  preserveAspectRatio?: boolean;
  stripMetadata?: boolean;
}

export interface CompressionOptions {
  enabled: boolean;
  level?: 'fast' | 'balanced' | 'max';
  targetSize?: number;
  targetBitrate?: string;
  preset?: string;
}

export interface ProcessingResult {
  id: string;
  inputPath: string;
  outputPath: string;
  outputFormat: MediaFormat;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  processingTimeMs: number;
  metadata: MediaMetadata;
  warnings: string[];
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  format?: ImageFormat;
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ThumbnailResult {
  path: string;
  width: number;
  height: number;
  format: ImageFormat;
  size: number;
}

export interface StreamingOptions {
  qualities: StreamingQuality[];
  segmentDuration?: number;
  playlistPath?: string;
}

export interface StreamingQuality {
  label: string;
  width: number;
  height: number;
  bitrate: string;
  maxBitrate?: string;
}

export interface DeliveryOptions {
  cacheControl?: string;
  cdnEnabled?: boolean;
  cdnProvider?: string;
  compress?: boolean;
  etag?: string;
  lastModified?: Date;
}

export interface CacheOptions {
  ttlSeconds: number;
  maxSizeBytes?: number;
  storage: 'memory' | 'disk';
  diskPath?: string;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  size: number;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
}

export interface StorageConfig {
  basePath: string;
  tempPath: string;
  maxFileSize: number;
  allowedFormats: MediaFormat[];
}

export interface MediaFactoryConfig {
  storage: StorageConfig;
  cache: CacheOptions;
  delivery: DeliveryOptions;
  processing: {
    maxConcurrent: number;
    timeout: number;
    tempDir: string;
  };
}
