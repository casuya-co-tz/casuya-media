import { VideoFormat } from '../../types';
import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

export interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  format?: VideoFormat;
  codec?: string;
  width?: number;
  height?: number;
  bitrate?: string;
  fps?: number;
  audioCodec?: string;
  audioBitrate?: string;
  audioSampleRate?: number;
  preset?: string;
  crf?: number;
  twoPass?: boolean;
  maxDuration?: number;
}

export interface TranscodeResult {
  outputPath: string;
  format: VideoFormat;
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  size: number;
  codec: string;
}

export class VideoTranscoder {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('video:transcoding');
  }

  async transcode(options: TranscodeOptions): Promise<TranscodeResult> {
    try {
      const info = await this.getVideoInfo(options.inputPath);

      const args = this.buildTranscodeArgs(options, info);
      await this.executeFfmpeg(args);

      const outputInfo = await this.getVideoInfo(options.outputPath);

      return {
        outputPath: options.outputPath,
        format: options.format || 'mp4',
        duration: outputInfo.duration as number,
        width: outputInfo.width as number,
        height: outputInfo.height as number,
        bitrate: outputInfo.bitrate as number,
        size: outputInfo.size as number,
        codec: outputInfo.codec as string,
      };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Video transcoding failed: ${(error as Error).message}`);
    }
  }

  async toHls(
    inputPath: string,
    outputDir: string,
    options: {
      segmentDuration?: number;
      playlistName?: string;
    } = {}
  ): Promise<{ playlistPath: string; segmentCount: number }> {
    const segmentDuration = options.segmentDuration || 10;
    const playlistName = options.playlistName || 'playlist.m3u8';

    const args = [
      '-i', inputPath,
      '-codec:', 'copy',
      '-start_number', '0',
      '-hls_time', segmentDuration.toString(),
      '-hls_list_size', '0',
      '-f', 'hls',
      `${outputDir}/${playlistName}`,
    ];

    await this.executeFfmpeg(args);

    const playlistPath = `${outputDir}/${playlistName}`;
    const segmentCount = await this.countSegments(outputDir);

    return { playlistPath, segmentCount };
  }

  async probe(inputPath: string): Promise<{
    format: string;
    duration: number;
    width: number;
    height: number;
    bitrate: number;
    size: number;
    codec: string;
    audioCodec: string;
    audioBitrate: number;
    fps: number;
  }> {
    const info = await this.getVideoInfo(inputPath);
    return {
      format: info.format as string,
      duration: info.duration as number,
      width: info.width as number,
      height: info.height as number,
      bitrate: info.bitrate as number,
      size: info.size as number,
      codec: info.codec as string,
      audioCodec: info.audioCodec as string,
      audioBitrate: info.audioBitrate as number,
      fps: info.fps as number,
    };
  }

  private buildTranscodeArgs(options: TranscodeOptions, info: Record<string, unknown>): string[] {
    const args: string[] = ['-i', options.inputPath];

    if (options.maxDuration) {
      args.push('-t', options.maxDuration.toString());
    }

    const width = options.width || (info.width as number);
    const height = options.height || (options.width && info.width
      ? Math.round((info.height as number) * (options.width / (info.width as number)))
      : info.height as number);

    if (width && height) {
      args.push('-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
    }

    const codec = options.codec || this.getDefaultCodec(options.format || 'mp4');
    args.push('-c:v', codec);

    if (options.crf !== undefined) {
      args.push('-crf', options.crf.toString());
    } else if (options.bitrate) {
      args.push('-b:v', options.bitrate);
    }

    if (options.fps) {
      args.push('-r', options.fps.toString());
    }

    if (options.preset) {
      args.push('-preset', options.preset);
    }

    const audioCodec = options.audioCodec || 'aac';
    args.push('-c:a', audioCodec);

    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate);
    }

    if (options.audioSampleRate) {
      args.push('-ar', options.audioSampleRate.toString());
    }

    args.push('-y', options.outputPath);
    return args;
  }

  private getDefaultCodec(format: VideoFormat): string {
    switch (format) {
      case 'mp4': return 'libx264';
      case 'webm': return 'libvpx-vp9';
      case 'ogv': return 'libtheora';
      default: return 'libx264';
    }
  }

  private async getVideoInfo(filePath: string): Promise<Record<string, unknown>> {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
    const { stdout } = await execFileAsync('ffprobe', args);
    const probe = JSON.parse(stdout);

    const videoStream = probe.streams?.find((s: Record<string, unknown>) => s.codec_type === 'video');
    const audioStream = probe.streams?.find((s: Record<string, unknown>) => s.codec_type === 'audio');

    return {
      format: probe.format?.format_name || 'unknown',
      duration: parseFloat(probe.format?.duration || '0'),
      width: (videoStream as Record<string, unknown>)?.width || 0,
      height: (videoStream as Record<string, unknown>)?.height || 0,
      bitrate: parseInt(probe.format?.bit_rate || '0', 10),
      size: parseInt(probe.format?.size || '0', 10),
      codec: (videoStream as Record<string, unknown>)?.codec_name || 'unknown',
      audioCodec: (audioStream as Record<string, unknown>)?.codec_name || 'unknown',
      audioBitrate: parseInt((audioStream as Record<string, unknown>)?.bit_rate as string || '0', 10),
      fps: this.parseFps((videoStream as Record<string, unknown>)?.r_frame_rate as string),
    };
  }

  private parseFps(fpsStr: string): number {
    if (!fpsStr) return 0;
    const parts = fpsStr.split('/');
    if (parts.length === 2) {
      return Math.round(parseInt(parts[0]) / parseInt(parts[1]));
    }
    return parseFloat(fpsStr);
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

  private async countSegments(dir: string): Promise<number> {
    const fs = require('fs').promises;
    try {
      const files = await fs.readdir(dir);
      return files.filter((f: string) => f.endsWith('.ts')).length;
    } catch {
      return 0;
    }
  }
}
