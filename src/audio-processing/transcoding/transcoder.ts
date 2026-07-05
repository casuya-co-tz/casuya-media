import { AudioFormat } from '../../types';
import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs').promises;

export interface AudioTranscodeOptions {
  inputPath: string;
  outputPath: string;
  format: AudioFormat;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  vbrQuality?: number;
}

export interface AudioTranscodeResult {
  outputPath: string;
  format: AudioFormat;
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
  size: number;
}

export class AudioTranscoder {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('audio:transcoding');
  }

  async transcode(options: AudioTranscodeOptions): Promise<AudioTranscodeResult> {
    try {
      const info = await this.getAudioInfo(options.inputPath);

      const args = this.buildTranscodeArgs(options);
      await this.executeFfmpeg(args);

      const outputInfo = await this.getAudioInfo(options.outputPath);

      return {
        outputPath: options.outputPath,
        format: options.format,
        duration: outputInfo.duration,
        sampleRate: outputInfo.sampleRate,
        channels: outputInfo.channels,
        bitrate: outputInfo.bitrate,
        size: await this.getFileSize(options.outputPath),
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Audio transcoding failed: ${(error as Error).message}`);
    }
  }

  async toMp3(inputPath: string, outputPath: string, bitrate?: string): Promise<AudioTranscodeResult> {
    return this.transcode({
      inputPath,
      outputPath,
      format: 'mp3',
      bitrate: bitrate || '192k',
    });
  }

  async toAac(inputPath: string, outputPath: string, bitrate?: string): Promise<AudioTranscodeResult> {
    return this.transcode({
      inputPath,
      outputPath,
      format: 'aac',
      bitrate: bitrate || '128k',
    });
  }

  async toOgg(inputPath: string, outputPath: string, quality?: number): Promise<AudioTranscodeResult> {
    return this.transcode({
      inputPath,
      outputPath,
      format: 'ogg',
      vbrQuality: quality || 3,
    });
  }

  async toFlac(inputPath: string, outputPath: string): Promise<AudioTranscodeResult> {
    return this.transcode({
      inputPath,
      outputPath,
      format: 'flac',
    });
  }

  async getFormats(): Promise<AudioFormat[]> {
    return ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
  }

  private buildTranscodeArgs(options: AudioTranscodeOptions): string[] {
    const args: string[] = ['-i', options.inputPath];

    const codec = options.codec || this.getDefaultCodec(options.format);
    args.push('-c:a', codec);

    if (options.bitrate) {
      args.push('-b:a', options.bitrate);
    }

    if (options.sampleRate) {
      args.push('-ar', options.sampleRate.toString());
    }

    if (options.channels) {
      args.push('-ac', options.channels.toString());
    }

    if (options.vbrQuality !== undefined) {
      args.push('-q:a', options.vbrQuality.toString());
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
      case 'wav': return 'pcm_s16le';
      case 'm4a': return 'aac';
      case 'wma': return 'wmav2';
      default: return 'libmp3lame';
    }
  }

  private async getAudioInfo(filePath: string): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
    bitrate: number;
  }> {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
    const { stdout } = await execFileAsync('ffprobe', args);
    const probe = JSON.parse(stdout);
    const audioStream = probe.streams?.find((s: Record<string, unknown>) => s.codec_type === 'audio');

    return {
      duration: parseFloat(probe.format?.duration || '0'),
      sampleRate: parseInt((audioStream as Record<string, unknown>)?.sample_rate as string || '0', 10),
      channels: parseInt((audioStream as Record<string, unknown>)?.channels as string || '0', 10),
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
