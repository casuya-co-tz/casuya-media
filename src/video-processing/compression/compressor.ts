import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

export interface VideoCompressionOptions {
  inputPath: string;
  outputPath: string;
  targetBitrate?: string;
  crf?: number;
  preset?: string;
  maxWidth?: number;
  maxHeight?: number;
  maxDuration?: number;
  pass?: 1 | 2;
}

export interface CompressionResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  bitrate: string;
  duration: number;
}

export class VideoCompressor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('video:compression');
  }

  async compress(options: VideoCompressionOptions): Promise<CompressionResult> {
    try {
      const originalSize = await this.getFileSize(options.inputPath);
      const info = await this.getVideoInfo(options.inputPath);

      const args = this.buildCompressionArgs(options, info);

      if (options.pass === 1 || options.pass === 2) {
        await this.executeFfmpeg(args);
      } else {
        await this.executeFfmpeg(args);
      }

      const compressedSize = await this.getFileSize(options.outputPath);

      return {
        outputPath: options.outputPath,
        originalSize,
        compressedSize,
        compressionRatio: compressedSize / originalSize,
        bitrate: options.targetBitrate || `${Math.round((compressedSize * 8) / (info.duration as number))}`,
        duration: info.duration as number,
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Video compression failed: ${(error as Error).message}`);
    }
  }

  async compressForMobile(inputPath: string, outputPath: string): Promise<CompressionResult> {
    return this.compress({
      inputPath,
      outputPath,
      maxWidth: 720,
      crf: 28,
      preset: 'fast',
    });
  }

  async compressForWeb(inputPath: string, outputPath: string): Promise<CompressionResult> {
    return this.compress({
      inputPath,
      outputPath,
      maxWidth: 1280,
      crf: 23,
      preset: 'medium',
    });
  }

  async estimateOutputSize(options: VideoCompressionOptions): Promise<number> {
    const info = await this.getVideoInfo(options.inputPath);
    const bitrate = this.parseBitrate(options.targetBitrate || `${Math.round((info.bitrate as number) * 0.5)}`);
    return Math.round((bitrate * (info.duration as number)) / 8);
  }

  private buildCompressionArgs(options: VideoCompressionOptions, info: Record<string, unknown>): string[] {
    const args: string[] = ['-i', options.inputPath];

    if (options.maxDuration) {
      args.push('-t', options.maxDuration.toString());
    }

    let vfFilter = '';
    if (options.maxWidth || options.maxHeight) {
      const maxWidth = options.maxWidth || 1920;
      const maxHeight = options.maxHeight || 1080;
      vfFilter = `scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease`;
    }

    if (vfFilter) {
      args.push('-vf', vfFilter);
    }

    args.push('-c:v', 'libx264');

    if (options.crf !== undefined) {
      args.push('-crf', options.crf.toString());
    }

    if (options.targetBitrate) {
      args.push('-b:v', options.targetBitrate);
    }

    if (options.preset) {
      args.push('-preset', options.preset);
    }

    args.push('-c:a', 'aac');
    args.push('-b:a', '128k');

    args.push('-y', options.outputPath);
    return args;
  }

  private parseBitrate(bitrate: string): number {
    if (bitrate.endsWith('k')) return parseInt(bitrate) * 1000;
    if (bitrate.endsWith('M')) return parseInt(bitrate) * 1000000;
    return parseInt(bitrate);
  }

  private async getVideoInfo(filePath: string): Promise<Record<string, unknown>> {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
    const { stdout } = await execFileAsync('ffprobe', args);
    const probe = JSON.parse(stdout);
    const videoStream = probe.streams?.find((s: Record<string, unknown>) => s.codec_type === 'video');

    return {
      duration: parseFloat(probe.format?.duration || '0'),
      width: (videoStream as Record<string, unknown>)?.width || 0,
      height: (videoStream as Record<string, unknown>)?.height || 0,
      bitrate: parseInt(probe.format?.bit_rate || '0', 10),
      size: parseInt(probe.format?.size || '0', 10),
      codec: (videoStream as Record<string, unknown>)?.codec_name || 'unknown',
    };
  }

  private async getFileSize(filePath: string): Promise<number> {
    const fs = require('fs').promises;
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  private async executeFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile('ffmpeg', args, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          reject(new ProcessingError(`FFmpeg error: ${error.message}\n${stderr}`));
          return;
        }
        resolve();
      });
    });
  }
}
