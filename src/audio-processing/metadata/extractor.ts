import { Logger } from '../../utilities/logger';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

export interface AudioMetadata {
  format: string;
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  codec: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  track?: number;
  size: number;
}

export class AudioMetadataExtractor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('audio:metadata');
  }

  async extract(filePath: string): Promise<AudioMetadata> {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const { stdout } = await execFileAsync('ffprobe', args);
    const probe = JSON.parse(stdout);

    const audioStream = probe.streams?.find(
      (s: Record<string, unknown>) => s.codec_type === 'audio'
    );

    const tags = (probe.format?.tags || {}) as Record<string, string>;
    const stream = audioStream as Record<string, unknown> | undefined;

    return {
      format: probe.format?.format_name || 'unknown',
      duration: parseFloat(probe.format?.duration || '0'),
      bitrate: parseInt(probe.format?.bit_rate || '0', 10),
      sampleRate: parseInt((stream?.sample_rate as string) || '0', 10),
      channels: parseInt((stream?.channels as string) || '0', 10),
      codec: (stream?.codec_name as string) || 'unknown',
      title: tags.title,
      artist: tags.artist,
      album: tags.album,
      genre: tags.genre,
      year: tags.date ? parseInt(tags.date, 10) : undefined,
      track: tags.track ? parseInt(tags.track.split('/')[0], 10) : undefined,
      size: parseInt(probe.format?.size || '0', 10),
    };
  }

  async hasMetadata(filePath: string): Promise<boolean> {
    const metadata = await this.extract(filePath);
    return !!(metadata.title || metadata.artist || metadata.album);
  }

  async stripMetadata(inputPath: string, outputPath: string): Promise<void> {
    const args = [
      '-i', inputPath,
      '-map_metadata', '-1',
      '-y', outputPath,
    ];
    await execFileAsync('ffmpeg', args);
  }
}
