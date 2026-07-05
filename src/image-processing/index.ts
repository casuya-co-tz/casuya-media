export { ImageCompressor, ImageCompressionOptions } from './compression';
export { ImageResizer, ResizeOptions } from './resizing';
export { ThumbnailGenerator, ThumbnailGeneratorOptions } from './thumbnails';
export { ImageOptimizer, ImageOptimizationOptions, OptimizationResult } from './optimization';

import { ImageCompressor, ImageCompressionOptions } from './compression';
import { ImageResizer, ResizeOptions } from './resizing';
import { ThumbnailGenerator, ThumbnailGeneratorOptions } from './thumbnails';
import { ImageOptimizer, ImageOptimizationOptions, OptimizationResult } from './optimization';
import { ProcessingOptions, ThumbnailOptions, ThumbnailResult } from '../types';
import { ProcessingError } from '../errors';
import { Logger } from '../utilities/logger';
interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  channels?: number;
  density?: number;
  hasAlpha?: boolean;
  size?: number;
}

const sharp = require('sharp');

export interface ImageProcessingPipelineOptions {
  thumbnailOutputDir: string;
  defaultQuality?: number;
  autoOptimize?: boolean;
}

export class ImageProcessingPipeline {
  private compressor: ImageCompressor;
  private resizer: ImageResizer;
  private thumbnailGenerator: ThumbnailGenerator;
  private optimizer: ImageOptimizer;
  private logger: Logger;
  private options: ImageProcessingPipelineOptions;

  constructor(options: ImageProcessingPipelineOptions) {
    this.options = options;
    this.compressor = new ImageCompressor();
    this.resizer = new ImageResizer();
    this.thumbnailGenerator = new ThumbnailGenerator({
      outputDir: options.thumbnailOutputDir,
      defaultQuality: options.defaultQuality,
    });
    this.optimizer = new ImageOptimizer();
    this.logger = new Logger('image:pipeline');
  }

  async process(
    inputBuffer: Buffer,
    options: ProcessingOptions = {}
  ): Promise<{
    buffer: Buffer;
    metadata: ImageMetadata;
    thumbnails: ThumbnailResult[];
  }> {
    try {
      let buffer = inputBuffer;

      if (options.width || options.height || options.maxWidth || options.maxHeight) {
        buffer = await this.resizer.resize(buffer, {
          width: options.width,
          height: options.height,
          maxWidth: options.maxWidth,
          maxHeight: options.maxHeight,
          fit: options.preserveAspectRatio ? 'inside' : 'fill',
        });
      }

      if (options.quality) {
        buffer = await this.compressor.compress(buffer, {
          quality: options.quality,
          strip: options.stripMetadata,
        });
      }

      if (this.options.autoOptimize && !options.quality) {
        const result = await this.optimizer.optimizeForWeb(buffer);
        buffer = result.buffer;
      }

      const metadata = await sharp(buffer).metadata();
      const thumbnails = await this.thumbnailGenerator.generateStandardSet(buffer);

      return { buffer, metadata, thumbnails };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Image processing pipeline failed: ${(error as Error).message}`);
    }
  }

  async getInfo(inputBuffer: Promise<Buffer>): Promise<ImageMetadata> {
    const buffer = await inputBuffer;
    return sharp(buffer).metadata();
  }
}
