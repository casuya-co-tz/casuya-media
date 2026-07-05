import {
  validateId,
  validateFormat,
  validateCategory,
  validateFileSize,
  validateProcessingOptions,
  validateThumbnailOptions,
} from '../utilities/validators';
import { ValidationError } from '../errors';

describe('Validators', () => {
  describe('validateId', () => {
    it('should accept valid IDs', () => {
      expect(() => validateId('test-123')).not.toThrow();
      expect(() => validateId('abc')).not.toThrow();
    });

    it('should reject empty or invalid IDs', () => {
      expect(() => validateId('')).toThrow();
      expect(() => validateId('   ')).toThrow();
      expect(() => validateId(null as any)).toThrow();
      expect(() => validateId(undefined as any)).toThrow();
    });
  });

  describe('validateFormat', () => {
    it('should accept valid formats', () => {
      expect(validateFormat('jpeg')).toBe('jpeg');
      expect(validateFormat('png')).toBe('png');
      expect(validateFormat('mp4')).toBe('mp4');
      expect(validateFormat('mp3')).toBe('mp3');
    });

    it('should reject invalid formats', () => {
      expect(() => validateFormat('xyz')).toThrow();
      expect(() => validateFormat('')).toThrow();
    });
  });

  describe('validateCategory', () => {
    it('should accept valid categories', () => {
      expect(validateCategory('image')).toBe('image');
      expect(validateCategory('video')).toBe('video');
      expect(validateCategory('audio')).toBe('audio');
    });

    it('should reject invalid categories', () => {
      expect(() => validateCategory('text')).toThrow();
      expect(() => validateCategory('')).toThrow();
    });
  });

  describe('validateFileSize', () => {
    it('should accept valid file sizes', () => {
      expect(() => validateFileSize(100, 1000)).not.toThrow();
      expect(() => validateFileSize(1000, 1000)).not.toThrow();
    });

    it('should reject zero or negative sizes', () => {
      expect(() => validateFileSize(0, 1000)).toThrow();
      expect(() => validateFileSize(-1, 1000)).toThrow();
    });

    it('should reject sizes exceeding max', () => {
      expect(() => validateFileSize(1001, 1000)).toThrow();
    });
  });

  describe('validateProcessingOptions', () => {
    it('should accept valid options', () => {
      expect(() => validateProcessingOptions({ quality: 80 }, 'image')).not.toThrow();
      expect(() => validateProcessingOptions({ width: 100, height: 100 }, 'image')).not.toThrow();
    });

    it('should reject invalid quality', () => {
      expect(() => validateProcessingOptions({ quality: 0 }, 'image')).toThrow();
      expect(() => validateProcessingOptions({ quality: 101 }, 'image')).toThrow();
    });

    it('should reject invalid dimensions', () => {
      expect(() => validateProcessingOptions({ width: 0 }, 'image')).toThrow();
      expect(() => validateProcessingOptions({ height: -1 }, 'image')).toThrow();
    });
  });

  describe('validateThumbnailOptions', () => {
    it('should accept valid dimensions', () => {
      expect(() => validateThumbnailOptions(100, 100)).not.toThrow();
      expect(() => validateThumbnailOptions(4096, 4096)).not.toThrow();
    });

    it('should reject invalid dimensions', () => {
      expect(() => validateThumbnailOptions(0, 100)).toThrow();
      expect(() => validateThumbnailOptions(100, 0)).toThrow();
      expect(() => validateThumbnailOptions(4097, 100)).toThrow();
    });
  });
});
