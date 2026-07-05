import { MediaFormat, MediaCategory, ProcessingOptions } from '../types';
import { ValidationError } from '../errors';
import { isFormatSupported, getCategoryForFormat } from './format-utils';

export function validateId(id: string): void {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError('Invalid ID: must be a non-empty string');
  }
}

export function validateFormat(format: string): MediaFormat {
  if (!isFormatSupported(format)) {
    throw new ValidationError(`Unsupported format: ${format}`);
  }
  return format as MediaFormat;
}

export function validateCategory(category: string): MediaCategory {
  if (!['image', 'video', 'audio'].includes(category)) {
    throw new ValidationError(`Invalid category: ${category}. Must be image, video, or audio`);
  }
  return category as MediaCategory;
}

export function validateFileSize(size: number, maxSize: number): void {
  if (size <= 0) {
    throw new ValidationError('File size must be greater than zero');
  }
  if (size > maxSize) {
    throw new ValidationError(`File size ${size} exceeds maximum ${maxSize}`);
  }
}

export function validateProcessingOptions(options: ProcessingOptions, category: MediaCategory): void {
  if (options.quality !== undefined) {
    if (options.quality < 1 || options.quality > 100) {
      throw new ValidationError('Quality must be between 1 and 100');
    }
  }
  if (options.width !== undefined && options.width <= 0) {
    throw new ValidationError('Width must be greater than zero');
  }
  if (options.height !== undefined && options.height <= 0) {
    throw new ValidationError('Height must be greater than zero');
  }
  if (options.maxWidth !== undefined && options.maxWidth <= 0) {
    throw new ValidationError('MaxWidth must be greater than zero');
  }
  if (options.maxHeight !== undefined && options.maxHeight <= 0) {
    throw new ValidationError('MaxHeight must be greater than zero');
  }
}

export function validateThumbnailOptions(width: number, height: number): void {
  if (width <= 0 || width > 4096) {
    throw new ValidationError('Thumbnail width must be between 1 and 4096');
  }
  if (height <= 0 || height > 4096) {
    throw new ValidationError('Thumbnail height must be between 1 and 4096');
  }
}
