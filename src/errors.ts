export class MediaError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;

  constructor(message: string, code: string, httpStatus = 500) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class StorageError extends MediaError {
  constructor(message: string, code = 'STORAGE_ERROR') {
    super(message, code, 500);
    this.name = 'StorageError';
  }
}

export class ProcessingError extends MediaError {
  constructor(message: string, code = 'PROCESSING_ERROR') {
    super(message, code, 422);
    this.name = 'ProcessingError';
  }
}

export class ValidationError extends MediaError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, code, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends MediaError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, code, 404);
    this.name = 'NotFoundError';
  }
}

export class FormatNotSupportedError extends MediaError {
  constructor(format: string) {
    super(`Format '${format}' is not supported`, 'FORMAT_NOT_SUPPORTED', 415);
    this.name = 'FormatNotSupportedError';
  }
}

export class QuotaExceededError extends MediaError {
  constructor(message: string, code = 'QUOTA_EXCEEDED') {
    super(message, code, 507);
    this.name = 'QuotaExceededError';
  }
}

export class CacheError extends MediaError {
  constructor(message: string, code = 'CACHE_ERROR') {
    super(message, code, 500);
    this.name = 'CacheError';
  }
}
