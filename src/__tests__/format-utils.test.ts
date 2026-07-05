import {
  getFormatFromFilename,
  getCategoryForFormat,
  getMimeType,
  isImageFormat,
  isVideoFormat,
  isAudioFormat,
  isFormatSupported,
  formatToExtension,
  formatBytes,
  formatDuration,
  generateId,
  calculateChecksum,
} from '../utilities/format-utils';

describe('FormatUtils', () => {
  describe('getFormatFromFilename', () => {
    it('should detect image formats', () => {
      expect(getFormatFromFilename('photo.jpg')).toBe('jpeg');
      expect(getFormatFromFilename('photo.jpeg')).toBe('jpeg');
      expect(getFormatFromFilename('image.png')).toBe('png');
      expect(getFormatFromFilename('image.webp')).toBe('webp');
      expect(getFormatFromFilename('image.avif')).toBe('avif');
      expect(getFormatFromFilename('animation.gif')).toBe('gif');
      expect(getFormatFromFilename('vector.svg')).toBe('svg');
      expect(getFormatFromFilename('bitmap.bmp')).toBe('bmp');
      expect(getFormatFromFilename('photo.tiff')).toBe('tiff');
      expect(getFormatFromFilename('photo.tif')).toBe('tiff');
    });

    it('should detect video formats', () => {
      expect(getFormatFromFilename('video.mp4')).toBe('mp4');
      expect(getFormatFromFilename('video.webm')).toBe('webm');
      expect(getFormatFromFilename('video.ogv')).toBe('ogv');
      expect(getFormatFromFilename('video.avi')).toBe('avi');
      expect(getFormatFromFilename('video.mov')).toBe('mov');
      expect(getFormatFromFilename('video.mkv')).toBe('mkv');
    });

    it('should detect audio formats', () => {
      expect(getFormatFromFilename('audio.mp3')).toBe('mp3');
      expect(getFormatFromFilename('audio.wav')).toBe('wav');
      expect(getFormatFromFilename('audio.ogg')).toBe('ogg');
      expect(getFormatFromFilename('audio.aac')).toBe('aac');
      expect(getFormatFromFilename('audio.flac')).toBe('flac');
      expect(getFormatFromFilename('audio.m4a')).toBe('m4a');
      expect(getFormatFromFilename('audio.wma')).toBe('wma');
    });

    it('should return undefined for unknown formats', () => {
      expect(getFormatFromFilename('file.xyz')).toBeUndefined();
      expect(getFormatFromFilename('noextension')).toBeUndefined();
    });

    it('should be case insensitive', () => {
      expect(getFormatFromFilename('photo.JPG')).toBe('jpeg');
      expect(getFormatFromFilename('photo.Jpg')).toBe('jpeg');
      expect(getFormatFromFilename('video.MP4')).toBe('mp4');
    });
  });

  describe('getCategoryForFormat', () => {
    it('should return correct categories', () => {
      expect(getCategoryForFormat('jpeg')).toBe('image');
      expect(getCategoryForFormat('png')).toBe('image');
      expect(getCategoryForFormat('webp')).toBe('image');
      expect(getCategoryForFormat('mp4')).toBe('video');
      expect(getCategoryForFormat('webm')).toBe('video');
      expect(getCategoryForFormat('mp3')).toBe('audio');
      expect(getCategoryForFormat('wav')).toBe('audio');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(getMimeType('jpeg')).toBe('image/jpeg');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('webp')).toBe('image/webp');
      expect(getMimeType('mp4')).toBe('video/mp4');
      expect(getMimeType('webm')).toBe('video/webm');
      expect(getMimeType('mp3')).toBe('audio/mpeg');
      expect(getMimeType('wav')).toBe('audio/wav');
      expect(getMimeType('ogg')).toBe('audio/ogg');
    });
  });

  describe('format detection helpers', () => {
    it('should correctly identify image formats', () => {
      expect(isImageFormat('jpeg')).toBe(true);
      expect(isImageFormat('png')).toBe(true);
      expect(isImageFormat('mp4')).toBe(false);
      expect(isImageFormat('mp3')).toBe(false);
    });

    it('should correctly identify video formats', () => {
      expect(isVideoFormat('mp4')).toBe(true);
      expect(isVideoFormat('webm')).toBe(true);
      expect(isVideoFormat('jpeg')).toBe(false);
      expect(isVideoFormat('mp3')).toBe(false);
    });

    it('should correctly identify audio formats', () => {
      expect(isAudioFormat('mp3')).toBe(true);
      expect(isAudioFormat('wav')).toBe(true);
      expect(isAudioFormat('jpeg')).toBe(false);
      expect(isAudioFormat('mp4')).toBe(false);
    });

    it('should correctly check format support', () => {
      expect(isFormatSupported('jpeg')).toBe(true);
      expect(isFormatSupported('mp4')).toBe(true);
      expect(isFormatSupported('mp3')).toBe(true);
      expect(isFormatSupported('xyz')).toBe(false);
    });
  });

  describe('formatToExtension', () => {
    it('should return correct extensions', () => {
      expect(formatToExtension('jpeg')).toBe('.jpg');
      expect(formatToExtension('png')).toBe('.png');
      expect(formatToExtension('mp4')).toBe('.mp4');
      expect(formatToExtension('mp3')).toBe('.mp3');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536000)).toBe('1.46 MB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate consistent checksums', () => {
      const buffer = Buffer.from('test data');
      const checksum1 = calculateChecksum(buffer);
      const checksum2 = calculateChecksum(buffer);
      expect(checksum1).toBe(checksum2);
    });

    it('should return different checksums for different data', () => {
      const buffer1 = Buffer.from('test data 1');
      const buffer2 = Buffer.from('test data 2');
      const checksum1 = calculateChecksum(buffer1);
      const checksum2 = calculateChecksum(buffer2);
      expect(checksum1).not.toBe(checksum2);
    });
  });
});
