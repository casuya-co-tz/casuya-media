import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';

const sharp = require('sharp');

export interface ResizeOptions {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  background?: string;
  kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
  withoutEnlargement?: boolean;
}

export class ImageResizer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('image:resizing');
  }

  async resize(inputBuffer: Buffer, options: ResizeOptions): Promise<Buffer> {
    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      let width = options.width;
      let height = options.height;

      if (options.maxWidth && metadata.width && metadata.width > options.maxWidth) {
        width = options.maxWidth;
      }
      if (options.maxHeight && metadata.height && metadata.height > options.maxHeight) {
        height = options.maxHeight;
      }

      if (!width && !height) {
        return inputBuffer;
      }

      const resizeOptions: Record<string, unknown> = {
        fit: options.fit || 'inside',
        kernel: options.kernel || 'lanczos3',
        withoutEnlargement: options.withoutEnlargement ?? true,
      };

      if (width) resizeOptions.width = width;
      if (height) resizeOptions.height = height;
      if (options.position) resizeOptions.position = options.position;

      const resized = await image.resize(resizeOptions).toBuffer();
      return resized;
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Image resize failed: ${(error as Error).message}`);
    }
  }

  calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    options: ResizeOptions
  ): { width: number; height: number } {
    let width = options.width || originalWidth;
    let height = options.height || originalHeight;

    if (options.maxWidth && width > options.maxWidth) {
      const ratio = options.maxWidth / width;
      width = options.maxWidth;
      height = Math.round(height * ratio);
    }

    if (options.maxHeight && height > options.maxHeight) {
      const ratio = options.maxHeight / height;
      height = options.maxHeight;
      width = Math.round(width * ratio);
    }

    if (options.width && !options.height) {
      const ratio = options.width / originalWidth;
      height = Math.round(originalHeight * ratio);
    }

    if (options.height && !options.width) {
      const ratio = options.height / originalHeight;
      width = Math.round(originalWidth * ratio);
    }

    return { width, height };
  }
}
