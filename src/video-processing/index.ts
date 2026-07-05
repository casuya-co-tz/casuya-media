export { VideoTranscoder, TranscodeOptions, TranscodeResult } from './transcoding';
export { VideoCompressor, VideoCompressionOptions, CompressionResult } from './compression';
export { VideoThumbnailGenerator, VideoThumbnailOptions, VideoThumbnailResult } from './thumbnails';
export { AdaptiveStreamingGenerator, AdaptiveStreamingConfig, HlsPlaylist } from './streaming';

import { VideoTranscoder, TranscodeOptions, TranscodeResult } from './transcoding';
import { VideoCompressor, VideoCompressionOptions, CompressionResult } from './compression';
import { VideoThumbnailGenerator, VideoThumbnailOptions, VideoThumbnailResult } from './thumbnails';
import { AdaptiveStreamingGenerator, AdaptiveStreamingConfig, HlsPlaylist } from './streaming';
import { ProcessingOptions, StreamingOptions, StreamingQuality } from '../types';
import { ProcessingError } from '../errors';
import { Logger } from '../utilities/logger';
import { generateId } from '../utilities/format-utils';

export interface VideoProcessingPipelineOptions {
  tempDir: string;
  thumbnailOutputDir: string;
  hlsOutputDir: string;
  defaultQuality?: string;
}

export class VideoProcessingPipeline {
  private transcoder: VideoTranscoder;
  private compressor: VideoCompressor;
  private thumbnailGenerator: VideoThumbnailGenerator;
  private streamingGenerator: AdaptiveStreamingGenerator;
  private logger: Logger;
  private options: VideoProcessingPipelineOptions;

  constructor(options: VideoProcessingPipelineOptions) {
    this.options = options;
    this.transcoder = new VideoTranscoder();
    this.compressor = new VideoCompressor();
    this.thumbnailGenerator = new VideoThumbnailGenerator(options.thumbnailOutputDir);
    this.streamingGenerator = new AdaptiveStreamingGenerator();
    this.logger = new Logger('video:pipeline');
  }

  async process(
    inputPath: string,
    options: ProcessingOptions = {}
  ): Promise<{
    outputPath: string;
    thumbnail: VideoThumbnailResult;
    metadata: Record<string, unknown>;
  }> {
    try {
      const id = generateId();
      const outputPath = `${this.options.tempDir}/processed-${id}.mp4`;

      const transcodeResult = await this.transcoder.transcode({
        inputPath,
        outputPath,
        width: options.width,
        height: options.height,
        bitrate: options.compression?.targetBitrate,
        preset: options.compression?.preset || 'medium',
      });

      const thumbnail = await this.thumbnailGenerator.generate(outputPath, {
        width: 320,
        height: 180,
        format: 'jpeg',
        quality: 85,
      });

      return {
        outputPath,
        thumbnail,
        metadata: {
          format: 'mp4',
          duration: transcodeResult.duration,
          width: transcodeResult.width,
          height: transcodeResult.height,
          bitrate: transcodeResult.bitrate,
          codec: transcodeResult.codec,
        },
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Video processing pipeline failed: ${(error as Error).message}`);
    }
  }

  async createHls(
    inputPath: string,
    qualities?: StreamingQuality[]
  ): Promise<HlsPlaylist[]> {
    const defaultQualities: StreamingQuality[] = qualities || [
      { label: 'low', width: 426, height: 240, bitrate: '400k', maxBitrate: '600k' },
      { label: 'medium', width: 640, height: 360, bitrate: '800k', maxBitrate: '1200k' },
      { label: 'high', width: 1280, height: 720, bitrate: '2500k', maxBitrate: '3500k' },
    ];

    const id = generateId();
    const outputDir = `${this.options.hlsOutputDir}/${id}`;

    return this.streamingGenerator.generateHls({
      inputPath,
      outputDir,
      qualities: defaultQualities,
    });
  }

  async getInfo(inputPath: string): Promise<Record<string, unknown>> {
    return this.transcoder.probe(inputPath);
  }

  async compressForWeb(inputPath: string): Promise<CompressionResult> {
    const id = generateId();
    const outputPath = `${this.options.tempDir}/web-${id}.mp4`;
    return this.compressor.compressForWeb(inputPath, outputPath);
  }

  async compressForMobile(inputPath: string): Promise<CompressionResult> {
    const id = generateId();
    const outputPath = `${this.options.tempDir}/mobile-${id}.mp4`;
    return this.compressor.compressForMobile(inputPath, outputPath);
  }
}
