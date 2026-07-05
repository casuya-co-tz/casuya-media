import { ThumbnailOptions, ThumbnailResult } from '../../types';
import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';
import { generateId } from '../../utilities/format-utils';

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

export interface ThumbnailGeneratorOptions {
  outputDir: string;
  defaultQuality?: number;
}

export class ThumbnailGenerator {
  private options: ThumbnailGeneratorOptions;
  private logger: Logger;

  constructor(options: ThumbnailGeneratorOptions) {
    this.options = options;
    this.logger = new Logger('image:thumbnails');
  }

  async generate(
    inputBuffer: Buffer,
    thumbnailOptions: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new ProcessingError('Cannot determine image dimensions');
      }

      const quality = thumbnailOptions.quality || this.options.defaultQuality || 80;
      const format = thumbnailOptions.format || 'webp';

      const resized = await image
        .resize({
          width: thumbnailOptions.width,
          height: thumbnailOptions.height,
          fit: thumbnailOptions.fit || 'cover',
          withoutEnlargement: true,
        })
        .toFormat(format, { quality })
        .toBuffer();

      const id = generateId();
      const filename = `thumb-${id}.${format}`;
      const outputPath = path.join(this.options.outputDir, filename);

      await fs.mkdir(this.options.outputDir, { recursive: true });
      await fs.writeFile(outputPath, resized);

      return {
        path: outputPath,
        width: thumbnailOptions.width,
        height: thumbnailOptions.height,
        format: format as 'webp' | 'jpeg' | 'png',
        size: resized.length,
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Thumbnail generation failed: ${(error as Error).message}`);
    }
  }

  async generateMultiple(
    inputBuffer: Buffer,
    sizes: ThumbnailOptions[]
  ): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];
    for (const size of sizes) {
      const result = await this.generate(inputBuffer, size);
      results.push(result);
    }
    return results;
  }

  async generateStandardSet(inputBuffer: Buffer): Promise<ThumbnailResult[]> {
    return this.generateMultiple(inputBuffer, [
      { width: 150, height: 150, fit: 'cover', format: 'webp', quality: 75 },
      { width: 300, height: 300, fit: 'cover', format: 'webp', quality: 80 },
      { width: 600, height: 400, fit: 'cover', format: 'webp', quality: 80 },
      { width: 1200, height: 800, fit: 'inside', format: 'webp', quality: 85 },
    ]);
  }
}
