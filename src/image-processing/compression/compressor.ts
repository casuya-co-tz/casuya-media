import { ProcessingOptions, ProcessingResult, MediaMetadata } from '../../types';
import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';

const sharp = require('sharp');

export interface ImageCompressionOptions {
  quality: number;
  effort?: number;
  lossless?: boolean;
  nearLossless?: boolean;
  strip?: boolean;
}

export class ImageCompressor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('image:compression');
  }

  async compress(
    inputBuffer: Buffer,
    options: ImageCompressionOptions
  ): Promise<Buffer> {
    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      const format = metadata.format;
      if (!format) {
        throw new ProcessingError('Unable to determine image format');
      }

      let pipeline = image;

      switch (format) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality: options.quality,
            mozjpeg: true,
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            quality: options.quality,
            compressionLevel: Math.round((100 - options.quality) / 10),
            palette: options.quality < 50,
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality: options.quality,
            effort: options.effort || 4,
            lossless: options.lossless || false,
          });
          break;
        case 'avif':
          pipeline = pipeline.avif({
            quality: options.quality,
            effort: options.effort || 4,
            lossless: options.lossless || false,
          });
          break;
        case 'gif':
          break;
        case 'tiff':
          pipeline = pipeline.tiff({
            quality: options.quality,
          });
          break;
      }

      if (options.strip !== false) {
        pipeline = pipeline.withMetadata(false);
      }

      return await pipeline.toBuffer();
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Image compression failed: ${(error as Error).message}`);
    }
  }

  calculateOptimalQuality(originalSize: number, targetRatio: number = 0.7): number {
    if (originalSize < 50000) return 85;
    if (originalSize < 200000) return 80;
    if (originalSize < 500000) return 75;
    if (originalSize < 1000000) return 70;
    if (originalSize < 2000000) return 65;
    return 60;
  }
}
