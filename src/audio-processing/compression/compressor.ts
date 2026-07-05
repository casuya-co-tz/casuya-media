import { AudioFormat } from '../../types';
import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs').promises;

export interface AudioCompressionOptions {
  inputPath: string;
  outputPath: string;
  format?: AudioFormat;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  quality?: number;
  vbr?: boolean;
}

export interface AudioCompressionResult {
  outputPath: string;
  format: AudioFormat;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  bitrate: string;
}

export class AudioCompressor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('audio:compression');
  }

  async compress(options: AudioCompressionOptions): Promise<AudioCompressionResult> {
    try {
      const originalSize = await this.getFileSize(options.inputPath);
      const info = await this.getAudioInfo(options.inputPath);

      const args = this.buildCompressionArgs(options);
      await this.executeFfmpeg(args);

      const compressedSize = await this.getFileSize(options.outputPath);
      const format = options.format || 'mp3';

      return {
        outputPath: options.outputPath,
        format,
        originalSize,
        compressedSize,
        compressionRatio: compressedSize / originalSize,
        duration: info.duration,
        bitrate: options.bitrate || '128k',
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Audio compression failed: ${(error as Error).message}`);
    }
  }

  async compressForWeb(inputPath: string, outputPath: string): Promise<AudioCompressionResult> {
    return this.compress({
      inputPath,
      outputPath,
      format: 'mp3',
      bitrate: '128k',
      sampleRate: 44100,
      channels: 2,
    });
  }

  async compressForMobile(inputPath: string, outputPath: string): Promise<AudioCompressionResult> {
    return this.compress({
      inputPath,
      outputPath,
      format: 'mp3',
      bitrate: '64k',
      sampleRate: 22050,
      channels: 1,
    });
  }

  async normalize(inputPath: string, outputPath: string, targetLoudness?: number): Promise<void> {
    const target = targetLoudness || -16;
    const args = [
      '-i', inputPath,
      '-af', `loudnorm=I=${target}:TP=-1:LRA=11`,
      '-y', outputPath,
    ];
    await this.executeFfmpeg(args);
  }

  async trim(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    const args = [
      '-i', inputPath,
      '-ss', startTime.toString(),
      '-to', endTime.toString(),
      '-c', 'copy',
      '-y', outputPath,
    ];
    await this.executeFfmpeg(args);
  }

  private buildCompressionArgs(options: AudioCompressionOptions): string[] {
    const args: string[] = ['-i', options.inputPath];

    if (options.sampleRate) {
      args.push('-ar', options.sampleRate.toString());
    }

    if (options.channels) {
      args.push('-ac', options.channels.toString());
    }

    const codec = options.codec || this.getDefaultCodec(options.format || 'mp3');
    args.push('-c:a', codec);

    if (options.bitrate) {
      args.push('-b:a', options.bitrate);
    }

    if (options.vbr && options.quality !== undefined) {
      args.push('-q:a', options.quality.toString());
    }

    args.push('-y', options.outputPath);
    return args;
  }

  private getDefaultCodec(format: AudioFormat): string {
    switch (format) {
      case 'mp3': return 'libmp3lame';
      case 'aac': return 'aac';
      case 'ogg': return 'libvorbis';
      case 'flac': return 'flac';
      default: return 'libmp3lame';
    }
  }

  private async getAudioInfo(filePath: string): Promise<{ duration: number; bitrate: number }> {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath];
    const { stdout } = await execFileAsync('ffprobe', args);
    const probe = JSON.parse(stdout);
    return {
      duration: parseFloat(probe.format?.duration || '0'),
      bitrate: parseInt(probe.format?.bit_rate || '0', 10),
    };
  }

  private async getFileSize(filePath: string): Promise<number> {
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
