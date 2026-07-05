export { AudioCompressor, AudioCompressionOptions, AudioCompressionResult } from './compression';
export { AudioTranscoder, AudioTranscodeOptions, AudioTranscodeResult } from './transcoding';
export { AudioMetadataExtractor, AudioMetadata } from './metadata';

import { AudioCompressor, AudioCompressionOptions, AudioCompressionResult } from './compression';
import { AudioTranscoder, AudioTranscodeOptions, AudioTranscodeResult } from './transcoding';
import { AudioMetadataExtractor, AudioMetadata } from './metadata';
import { ProcessingOptions } from '../types';
import { ProcessingError } from '../errors';
import { Logger } from '../utilities/logger';
import { generateId } from '../utilities/format-utils';
import { AudioFormat } from '../types';

export interface AudioProcessingPipelineOptions {
  tempDir: string;
  defaultFormat?: AudioFormat;
  defaultBitrate?: string;
}

export class AudioProcessingPipeline {
  private compressor: AudioCompressor;
  private transcoder: AudioTranscoder;
  private metadataExtractor: AudioMetadataExtractor;
  private logger: Logger;
  private options: AudioProcessingPipelineOptions;

  constructor(options: AudioProcessingPipelineOptions) {
    this.options = options;
    this.compressor = new AudioCompressor();
    this.transcoder = new AudioTranscoder();
    this.metadataExtractor = new AudioMetadataExtractor();
    this.logger = new Logger('audio:pipeline');
  }

  async process(
    inputPath: string,
    options: ProcessingOptions = {}
  ): Promise<{
    outputPath: string;
    metadata: AudioMetadata;
    compressedSize: number;
  }> {
    try {
      const id = generateId();
      const format = options.format as AudioFormat || this.options.defaultFormat || 'mp3';
      const extension = format === 'aac' ? 'm4a' : format;
      const outputPath = `${this.options.tempDir}/processed-${id}.${extension}`;

      const compressionResult = await this.compressor.compress({
        inputPath,
        outputPath,
        format,
        bitrate: options.compression?.targetBitrate || this.options.defaultBitrate || '128k',
      });

      const metadata = await this.metadataExtractor.extract(outputPath);

      return {
        outputPath,
        metadata,
        compressedSize: compressionResult.compressedSize,
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Audio processing pipeline failed: ${(error as Error).message}`);
    }
  }

  async getInfo(inputPath: string): Promise<AudioMetadata> {
    return this.metadataExtractor.extract(inputPath);
  }

  async convertFormat(
    inputPath: string,
    targetFormat: AudioFormat
  ): Promise<AudioTranscodeResult> {
    const id = generateId();
    const extension = targetFormat === 'aac' ? 'm4a' : targetFormat;
    const outputPath = `${this.options.tempDir}/converted-${id}.${extension}`;

    return this.transcoder.transcode({
      inputPath,
      outputPath,
      format: targetFormat,
    });
  }

  async normalize(inputPath: string, targetLoudness?: number): Promise<string> {
    const id = generateId();
    const outputPath = `${this.options.tempDir}/normalized-${id}.wav`;
    await this.compressor.normalize(inputPath, outputPath, targetLoudness);
    return outputPath;
  }

  async trim(inputPath: string, startTime: number, endTime: number): Promise<string> {
    const id = generateId();
    const outputPath = `${this.options.tempDir}/trimmed-${id}.wav`;
    await this.compressor.trim(inputPath, outputPath, startTime, endTime);
    return outputPath;
  }

  async stripMetadata(inputPath: string): Promise<string> {
    const id = generateId();
    const outputPath = `${this.options.tempDir}/stripped-${id}.wav`;
    await this.metadataExtractor.stripMetadata(inputPath, outputPath);
    return outputPath;
  }
}
