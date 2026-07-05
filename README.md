<div align="center">

# casuya-media

**Multimedia Factory for Education**

Store, Optimize, and Deliver Educational Media at Scale

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-78%20passing-brightgreen.svg)]()
[![Coverage](https://img.shields.io/badge/coverage-24%25-yellow.svg)]()

---

**Part of the Casuya Education Platform**

[Phase 1](https://github.com/casuya) | [Phase 2](https://github.com/casuya) | [Documentation](https://github.com/casuya)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Modules](#modules)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Examples](#examples)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

`casuya-media` is the multimedia processing and delivery layer of the Casuya Education Platform. It handles all media operations including storage, optimization, compression, and delivery for educational content.

### Key Features

| Feature | Description |
|---------|-------------|
| **Image Processing** | Compression, resizing, thumbnails, web optimization via Sharp |
| **Video Processing** | Transcoding, compression, HLS streaming via FFmpeg |
| **Audio Processing** | Transcoding, normalization, metadata extraction via FFmpeg |
| **Smart Delivery** | Range requests, CORS, network-aware optimization |
| **Intelligent Caching** | Memory/disk LRU cache with TTL and size limits |
| **Metadata Indexing** | Searchable media library with tags and statistics |

### Design Principles

- **Educational Focus** - Built specifically for learning content
- **Low-End Device Friendly** - Optimized for weak Android devices
- **Unreliable Internet** - Works offline with automatic retry
- **Extensible** - Plugin architecture for new formats and features
- **Cost Efficient** - Reduces bandwidth and storage costs

---

## Architecture

```
casuya-media/
│
├── image-processing/          # Sharp-based image operations
│   ├── compression/           # Quality-aware compression
│   ├── resizing/              # Smart resize with aspect ratio
│   ├── thumbnails/            # Multi-size thumbnail generation
│   └── optimization/          # Web/mobile presets
│
├── video-processing/          # FFmpeg-based video operations
│   ├── transcoding/           # Format conversion
│   ├── compression/           # Bitrate/CRF optimization
│   ├── thumbnails/            # Time-based frame extraction
│   └── streaming/             # HLS adaptive streaming
│
├── audio-processing/          # FFmpeg-based audio operations
│   ├── compression/           # Format conversion
│   ├── transcoding/           # Multi-format support
│   └── metadata/              # Tag extraction
│
├── delivery/                  # Content delivery
├── caching/                   # LRU cache system
├── metadata/                  # Searchable index
├── storage/                   # File management
├── utilities/                 # Shared tools
└── media-factory.ts           # Unified facade
```

---

## Quick Start

### Installation

```bash
npm install casuya-media
```

### Basic Usage

```typescript
import { MediaFactory } from 'casuya-media';

// Initialize the factory
const media = new MediaFactory({
  storage: {
    basePath: './media',
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  cache: {
    ttlSeconds: 3600,
    storage: 'memory',
  },
});

await media.initialize();

// Upload an image
const imageBuffer = await fs.readFile('lesson-diagram.png');
const item = await media.upload(imageBuffer, 'lesson-diagram.png', {
  lessonId: 'math-101',
  tags: ['algebra', 'graphs'],
  process: true,
});

console.log(`Stored: ${item.id}`);
console.log(`URL: ${item.url}`);

// Deliver the image
const response = await media.deliver(item.id);
// Returns buffer with proper Content-Type, Cache-Control, etc.
```

---

## Modules

### Image Processing

```typescript
import { ImageProcessingPipeline } from 'casuya-media/image-processing';

const pipeline = new ImageProcessingPipeline({
  thumbnailOutputDir: './thumbnails',
  autoOptimize: true,
});

// Process with auto-optimization
const result = await pipeline.process(imageBuffer, {
  maxWidth: 1200,
  quality: 80,
});

// Generate thumbnails
const thumbnails = await pipeline.process(imageBuffer, {});
// Returns thumbnails at 150x150, 300x300, 600x400, 1200x800
```

### Video Processing

```typescript
import { VideoProcessingPipeline } from 'casuya-media/video-processing';

const pipeline = new VideoProcessingPipeline({
  tempDir: './temp',
  thumbnailOutputDir: './thumbnails',
  hlsOutputDir: './hls',
});

// Process video for web
const result = await pipeline.process(videoPath, {
  width: 1280,
  compression: {
    targetBitrate: '2500k',
    preset: 'medium',
  },
});

// Create HLS streaming
const playlists = await pipeline.createHls(videoPath);
```

### Audio Processing

```typescript
import { AudioProcessingPipeline } from 'casuya-media/audio-processing';

const pipeline = new AudioProcessingPipeline({
  tempDir: './temp',
  defaultFormat: 'mp3',
  defaultBitrate: '128k',
});

// Process and compress
const result = await pipeline.process(audioPath, {
  format: 'mp3',
  compression: {
    targetBitrate: '128k',
  },
});

// Normalize audio levels
const normalizedPath = await pipeline.normalize(audioPath, -16);
```

### Caching

```typescript
import { MediaCache } from 'casuya-media/caching';

const cache = new MediaCache({
  ttlSeconds: 3600,
  storage: 'memory', // or 'disk'
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
});

await cache.initialize();

// Store with custom TTL
await cache.set('key', value, 300); // 5 minutes

// Retrieve
const cached = await cache.get('key');
```

### Delivery

```typescript
import { MediaDelivery } from 'casuya-media/delivery';

const delivery = new MediaDelivery({
  cacheControl: 'public, max-age=31536000',
  compress: true,
});

// Deliver with proper headers
const response = await delivery.deliver(item, buffer, {
  cacheControl: 'public, max-age=86400',
});

// Handle range requests (for video/audio)
const range = delivery.parseRangeHeader('bytes=0-499');
const partial = delivery.handleRangeRequest(buffer, range);

// Network-aware optimization
const optimized = delivery.optimizeForNetwork(buffer, '3g');
```

---

## Configuration

```typescript
interface MediaFactoryConfig {
  storage: {
    basePath: string;           // Storage root directory
    tempPath: string;           // Temporary files directory
    maxFileSize: number;        // Max file size in bytes
    allowedFormats: MediaFormat[]; // Allowed media formats
  };
  cache: {
    ttlSeconds: number;         // Cache time-to-live
    storage: 'memory' | 'disk'; // Cache storage type
    maxSizeBytes?: number;      // Max cache size (memory only)
    diskPath?: string;          // Disk cache path
  };
  delivery: {
    cacheControl: string;       // Default Cache-Control header
    compress: boolean;          // Enable compression
    cdnEnabled?: boolean;       // Enable CDN headers
  };
  processing: {
    maxConcurrent: number;      // Max parallel operations
    timeout: number;            // Operation timeout (ms)
    tempDir: string;            // Temp files for processing
  };
}
```

---

## Supported Formats

| Category | Formats |
|----------|---------|
| **Images** | JPEG, PNG, WebP, AVIF, GIF, SVG, BMP, TIFF |
| **Video** | MP4, WebM, OGV, AVI, MOV, MKV |
| **Audio** | MP3, WAV, OGG, AAC, FLAC, M4A, WMA |

---

## Development

### Prerequisites

- Node.js 20+
- FFmpeg (for video/audio processing)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/casuya/casuya-media.git
cd casuya-media

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

### Project Structure

```
casuya-media/
├── src/                    # Source code
│   ├── image-processing/   # Image operations
│   ├── video-processing/   # Video operations
│   ├── audio-processing/   # Audio operations
│   ├── delivery/           # Content delivery
│   ├── caching/            # Cache system
│   ├── metadata/           # Metadata index
│   ├── storage/            # File storage
│   ├── utilities/          # Shared tools
│   ├── errors.ts           # Error types
│   ├── types.ts            # Type definitions
│   ├── media-factory.ts    # Main entry point
│   └── __tests__/          # Test files
├── dist/                   # Compiled output
├── .github/                # GitHub templates
├── package.json
├── tsconfig.json
├── jest.config.js
├── LICENSE
└── README.md
```

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test:watch

# Run specific test
npm test -- --testPathPattern=cache
```

### Test Coverage

| Module | Coverage |
|--------|----------|
| errors | 100% |
| format-utils | 96% |
| validators | 94% |
| metadata | 79% |
| delivery | 100% |
| caching | 54% |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Sharp](https://sharp.pixelplumbing.com/) - High-performance image processing
- [FFmpeg](https://ffmpeg.org/) - Audio/video processing
- Built for the [Casuya Education Platform](https://github.com/casuya)

---

<div align="center">

**Part of the Casuya Education Platform**

[GitHub](https://github.com/casuya) | [Documentation](https://github.com/casuya) | [Issues](https://github.com/casuya/casuya-media/issues)

</div>
