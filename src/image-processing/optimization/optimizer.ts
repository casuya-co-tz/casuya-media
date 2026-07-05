import { ProcessingOptions, ProcessingResult } from '../../types';
import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';
import { ImageCompressor } from '../compression';
import { ImageResizer, ResizeOptions } from '../resizing';

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

export interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  stripMetadata?: boolean;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  autoOptimize?: boolean;
  targetSize?: number;
}

export interface OptimizationResult {
  buffer: Buffer;
  format: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
}

export class ImageOptimizer {
  private logger: Logger;
  private compressor: ImageCompressor;
  private resizer: ImageResizer;

  constructor() {
    this.logger = new Logger('image:optimization');
    this.compressor = new ImageCompressor();
    this.resizer = new ImageResizer();
  }

  async optimize(
    inputBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizationResult> {
    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new ProcessingError('Cannot determine image dimensions');
      }

      let pipeline = image;
      let optimizedBuffer = inputBuffer;

      if (options.maxWidth || options.maxHeight) {
        const resizeOpts: ResizeOptions = {
          maxWidth: options.maxWidth,
          maxHeight: options.maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        };
        const resized = await this.resizer.resize(inputBuffer, resizeOpts);
        pipeline = sharp(resized);
        optimizedBuffer = resized;
      }

      if (options.format) {
        pipeline = pipeline.toFormat(options.format, {
          quality: options.quality || 80,
        });
      } else if (options.autoOptimize) {
        const format = this.determineBestFormat(metadata.format || 'jpeg');
        pipeline = pipeline.toFormat(format, {
          quality: options.quality || this.calculateOptimalQuality(inputBuffer.length),
        });
      }

      if (options.stripMetadata !== false) {
        pipeline = pipeline.withMetadata(false);
      }

      optimizedBuffer = await pipeline.toBuffer();

      const resultMetadata = await sharp(optimizedBuffer).metadata();

      return {
        buffer: optimizedBuffer,
        format: resultMetadata.format || 'unknown',
        originalSize: inputBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: optimizedBuffer.length / inputBuffer.length,
        dimensions: {
          width: resultMetadata.width || 0,
          height: resultMetadata.height || 0,
        },
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Image optimization failed: ${(error as Error).message}`);
    }
  }

  async optimizeForWeb(inputBuffer: Buffer): Promise<OptimizationResult> {
    return this.optimize(inputBuffer, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 80,
      autoOptimize: true,
      stripMetadata: true,
    });
  }

  async optimizeForThumbnail(inputBuffer: Buffer): Promise<OptimizationResult> {
    return this.optimize(inputBuffer, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 75,
      format: 'webp',
      stripMetadata: true,
    });
  }

  async batchOptimize(
    inputs: { buffer: Buffer; options?: ImageOptimizationOptions }[]
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    for (const input of inputs) {
      const result = await this.optimize(input.buffer, input.options);
      results.push(result);
    }
    return results;
  }

  private determineBestFormat(currentFormat: string): string {
    if (currentFormat === 'png') return 'png';
    if (currentFormat === 'gif') return 'gif';
    if (currentFormat === 'svg') return 'svg';
    return 'webp';
  }

  private calculateOptimalQuality(size: number): number {
    if (size < 50000) return 85;
    if (size < 200000) return 80;
    if (size < 500000) return 75;
    if (size < 1000000) return 70;
    return 65;
  }
}
