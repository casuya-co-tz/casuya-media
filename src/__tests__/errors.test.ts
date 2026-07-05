import {
  MediaError,
  StorageError,
  ProcessingError,
  ValidationError,
  NotFoundError,
  FormatNotSupportedError,
  QuotaExceededError,
  CacheError,
} from '../errors';

describe('Errors', () => {
  describe('MediaError', () => {
    it('should create error with message and code', () => {
      const error = new MediaError('Test error', 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.httpStatus).toBe(500);
      expect(error.name).toBe('MediaError');
    });

    it('should accept custom httpStatus', () => {
      const error = new MediaError('Not found', 'NOT_FOUND', 404);
      expect(error.httpStatus).toBe(404);
    });
  });

  describe('StorageError', () => {
    it('should create storage error with defaults', () => {
      const error = new StorageError('Storage failed');
      expect(error.message).toBe('Storage failed');
      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.httpStatus).toBe(500);
      expect(error.name).toBe('StorageError');
    });
  });

  describe('ProcessingError', () => {
    it('should create processing error with defaults', () => {
      const error = new ProcessingError('Processing failed');
      expect(error.message).toBe('Processing failed');
      expect(error.code).toBe('PROCESSING_ERROR');
      expect(error.httpStatus).toBe(422);
      expect(error.name).toBe('ProcessingError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with defaults', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.httpStatus).toBe(400);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with defaults', () => {
      const error = new NotFoundError('Item not found');
      expect(error.message).toBe('Item not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.httpStatus).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('FormatNotSupportedError', () => {
    it('should create format not supported error', () => {
      const error = new FormatNotSupportedError('xyz');
      expect(error.message).toBe("Format 'xyz' is not supported");
      expect(error.code).toBe('FORMAT_NOT_SUPPORTED');
      expect(error.httpStatus).toBe(415);
      expect(error.name).toBe('FormatNotSupportedError');
    });
  });

  describe('QuotaExceededError', () => {
    it('should create quota exceeded error with defaults', () => {
      const error = new QuotaExceededError('Storage full');
      expect(error.message).toBe('Storage full');
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.httpStatus).toBe(507);
      expect(error.name).toBe('QuotaExceededError');
    });
  });

  describe('CacheError', () => {
    it('should create cache error with defaults', () => {
      const error = new CacheError('Cache failed');
      expect(error.message).toBe('Cache failed');
      expect(error.code).toBe('CACHE_ERROR');
      expect(error.httpStatus).toBe(500);
      expect(error.name).toBe('CacheError');
    });
  });

  describe('error inheritance', () => {
    it('should be instances of Error', () => {
      const errors = [
        new MediaError('test', 'TEST'),
        new StorageError('test'),
        new ProcessingError('test'),
        new ValidationError('test'),
        new NotFoundError('test'),
        new FormatNotSupportedError('test'),
        new QuotaExceededError('test'),
        new CacheError('test'),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(MediaError);
      });
    });
  });
});
