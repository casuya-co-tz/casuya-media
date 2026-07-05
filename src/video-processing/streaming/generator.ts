import { StreamingOptions, StreamingQuality } from '../../types';
import { ProcessingError } from '../../errors';
import { Logger } from '../../utilities/logger';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs').promises;
const path = require('path');

export interface HlsSegment {
  index: number;
  filename: string;
  duration: number;
  path: string;
}

export interface HlsPlaylist {
  path: string;
  duration: number;
  segments: HlsSegment[];
  variant?: string;
}

export interface AdaptiveStreamingConfig {
  inputPath: string;
  outputDir: string;
  qualities: StreamingQuality[];
  segmentDuration?: number;
  keyframeInterval?: number;
}

export class AdaptiveStreamingGenerator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('video:streaming');
  }

  async generateHls(config: AdaptiveStreamingConfig): Promise<HlsPlaylist[]> {
    try {
      await fs.mkdir(config.outputDir, { recursive: true });
      const playlists: HlsPlaylist[] = [];

      const segmentDuration = config.segmentDuration || 6;
      const keyframeInterval = config.keyframeInterval || segmentDuration * 2;

      for (const quality of config.qualities) {
        const qualityDir = path.join(config.outputDir, quality.label);
        await fs.mkdir(qualityDir, { recursive: true });

        const playlistPath = path.join(qualityDir, 'playlist.m3u8');

        const args = [
          '-i', config.inputPath,
          '-vf', `scale=${quality.width}:${quality.height}:force_original_aspect_ratio=decrease`,
          '-c:v', 'libx264',
          '-b:v', quality.bitrate,
          '-maxrate', quality.maxBitrate || quality.bitrate,
          '-bufsize', quality.bitrate,
          '-c:a', 'aac',
          '-b:a', '128k',
          '-hls_time', segmentDuration.toString(),
          '-hls_key_info_file', '/dev/null',
          '-g', keyframeInterval.toString(),
          '-hls_playlist_type', 'vod',
          '-hls_segment_filename', path.join(qualityDir, 'segment-%03d.ts'),
          '-y', playlistPath,
        ];

        await this.executeFfmpeg(args);

        const segments = await this.parsePlaylist(playlistPath);
        const duration = segments.reduce((sum, s) => sum + s.duration, 0);

        playlists.push({
          path: playlistPath,
          duration,
          segments,
          variant: quality.label,
        });
      }

      if (config.qualities.length > 1) {
        const masterPlaylist = this.generateMasterPlaylist(config.qualities, config.outputDir);
        this.logger.info('Master playlist created', { path: masterPlaylist });
      }

      return playlists;
    } catch (error) {
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError(`HLS generation failed: ${(error as Error).message}`);
    }
  }

  private generateMasterPlaylist(qualities: StreamingQuality[], outputDir: string): string {
    let content = '#EXTM3U\n';
    content += '#EXT-X-VERSION:3\n\n';

    for (const quality of qualities) {
      const bandwidth = this.parseBitrate(quality.bitrate);
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${quality.width}x${quality.height}\n`;
      content += `${quality.label}/playlist.m3u8\n\n`;
    }

    const masterPath = path.join(outputDir, 'master.m3u8');
    fs.writeFile(masterPath, content);
    return masterPath;
  }

  private parseBitrate(bitrate: string): number {
    if (bitrate.endsWith('k')) return parseInt(bitrate) * 1000;
    if (bitrate.endsWith('M')) return parseInt(bitrate) * 1000000;
    return parseInt(bitrate);
  }

  private async parsePlaylist(playlistPath: string): Promise<HlsSegment[]> {
    const content = await fs.readFile(playlistPath, 'utf-8');
    const segments: HlsSegment[] = [];
    const lines = content.split('\n');
    let index = 0;
    let duration = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        duration = parseFloat(line.replace('#EXTINF:', '').split(',')[0]);
      } else if (line.length > 0 && !line.startsWith('#')) {
        segments.push({
          index,
          filename: line,
          duration,
          path: path.join(path.dirname(playlistPath), line),
        });
        index++;
      }
    }

    return segments;
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
