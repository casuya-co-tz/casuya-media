import { MediaFormat, MediaCategory } from '../types';

const IMAGE_FORMATS: ImageFormat[] = ['jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'tiff'];
const VIDEO_FORMATS: VideoFormat[] = ['mp4', 'webm', 'ogv', 'avi', 'mov', 'mkv'];
const AUDIO_FORMATS: AudioFormat[] = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];

type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg' | 'bmp' | 'tiff';
type VideoFormat = 'mp4' | 'webm' | 'ogv' | 'avi' | 'mov' | 'mkv';
type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac' | 'flac' | 'm4a' | 'wma';

const FORMAT_EXTENSIONS: Record<string, MediaFormat> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
  '.avif': 'avif',
  '.gif': 'gif',
  '.svg': 'svg',
  '.bmp': 'bmp',
  '.tiff': 'tiff',
  '.tif': 'tiff',
  '.mp4': 'mp4',
  '.webm': 'webm',
  '.ogv': 'ogv',
  '.avi': 'avi',
  '.mov': 'mov',
  '.mkv': 'mkv',
  '.mp3': 'mp3',
  '.wav': 'wav',
  '.ogg': 'ogg',
  '.aac': 'aac',
  '.flac': 'flac',
  '.m4a': 'm4a',
  '.wma': 'wma',
};

const MIME_TYPES: Record<MediaFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  wma: 'audio/x-ms-wma',
};

export function getFormatFromFilename(filename: string): MediaFormat | undefined {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return undefined;
  const ext = filename.substring(lastDot).toLowerCase();
  return FORMAT_EXTENSIONS[ext];
}

export function getCategoryForFormat(format: MediaFormat): MediaCategory {
  if ((IMAGE_FORMATS as string[]).includes(format)) return 'image';
  if ((VIDEO_FORMATS as string[]).includes(format)) return 'video';
  if ((AUDIO_FORMATS as string[]).includes(format)) return 'audio';
  throw new Error(`Unknown format: ${format}`);
}

export function getMimeType(format: MediaFormat): string {
  return MIME_TYPES[format] || 'application/octet-stream';
}

export function isImageFormat(format: string): format is ImageFormat {
  return (IMAGE_FORMATS as string[]).includes(format);
}

export function isVideoFormat(format: string): format is VideoFormat {
  return (VIDEO_FORMATS as string[]).includes(format);
}

export function isAudioFormat(format: string): format is AudioFormat {
  return (AUDIO_FORMATS as string[]).includes(format);
}

export function isFormatSupported(format: string): format is MediaFormat {
  return (
    (IMAGE_FORMATS as string[]).includes(format) ||
    (VIDEO_FORMATS as string[]).includes(format) ||
    (AUDIO_FORMATS as string[]).includes(format)
  );
}

export function formatToExtension(format: MediaFormat): string {
  const entries = Object.entries(FORMAT_EXTENSIONS);
  for (const [ext, fmt] of entries) {
    if (fmt === format) return ext;
  }
  return `.${format}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function calculateChecksum(data: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}
