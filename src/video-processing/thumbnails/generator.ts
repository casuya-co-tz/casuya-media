import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';
import { generateId } from '../../utilities/format-utils';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs').promises;
const path = require('path');

export interface VideoThumbnailOptions {
  timeOffset?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface VideoThumbnailResult {
  path: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export class VideoThumbnailGenerator {
  private logger: Logger;
  private outputDir: string;

  constructor(outputDir: string) {
    this.logger = new Logger('video:thumbnails');
    this.outputDir = outputDir;
  }

  async generate(
    inputPath: string,
    options: VideoThumbnailOptions = {}
  ): Promise<VideoThumbnailResult> {
    try {
      const info = await this.getVideoInfo(inputPath);
      const timeOffset = options.timeOffset || Math.min(1, info.duration * 0.1);
      const width = options.width || 320;
      const height = options.height || Math.round(width * (info.height / info.width));
      const format = options.format || 'jpeg';
      const quality = options.quality || 85;

      const id = generateId();
      const filename = `vthumb-${id}.${format}`;
      const outputPath = path.join(this.outputDir, filename);

      await fs.mkdir(this.outputDir, { recursive: true });

      const args = [
        '-i', inputPath,
        '-ss', timeOffset.toString(),
        '-vframes', '1',
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        '-q:v', Math.round((100 - quality) / 5).toString(),
        '-y', outputPath,
      ];

      await this.executeFfmpeg(args);
      const stats = await fs.stat(outputPath);

      return { path: outputPath, width, height, format, size: stats.size };
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`Video thumbnail generation failed: ${(error as Error).message}`);
    }
  }

  async generateMultiple(inputPath: string, count: number): Promise<VideoThumbnailResult[]> {
    const info = await this.getVideoInfo(inputPath);
    const interval = info.duration / (count + 1);
    const results: VideoThumbnailResult[] = [];

    for (let i = 1; i <= count; i++) {
      const result = await this.generate(inputPath, {
        timeOffset: interval * i,
        width: 320,
        height: 180,
        format: 'jpeg',
        quality: 80,
      });
      results.push(result);
    }
    return results;
  }

  private async getVideoInfo(filePath: string): Promise<{ width: number; height: number; duration: number }> {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
    const { stdout } = await execFileAsync('ffprobe', args);
    const probe = JSON.parse(stdout);
    const videoStream = probe.streams?.find((s: Record<string, unknown>) => s.codec_type === 'video');
    const stream = videoStream as Record<string, unknown> | undefined;
    return {
      width: (stream?.width as number) || 0,
      height: (stream?.height as number) || 0,
      duration: parseFloat(probe.format?.duration || '0'),
    };
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
