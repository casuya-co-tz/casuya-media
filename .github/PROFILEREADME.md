# casuya-media

Multimedia Factory for Education - Store, Optimize, and Deliver Educational Media at Scale.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Build](https://github.com/casuya/casuya-media/actions/workflows/ci.yml/badge.svg)](https://github.com/casuya/casuya-media/actions)

---

## Overview

casuya-media is the multimedia processing and delivery layer of the Casuya Education Platform. It provides:

- **Image Processing** - Compression, resizing, thumbnails, optimization
- **Video Processing** - Transcoding, compression, HLS streaming
- **Audio Processing** - Transcoding, normalization, metadata extraction
- **Smart Delivery** - Range requests, CORS, network-aware optimization
- **Intelligent Caching** - Memory/disk LRU cache with TTL

## Quick Start

```bash
npm install casuya-media
```

```typescript
import { MediaFactory } from 'casuya-media';

const media = new MediaFactory();
await media.initialize();

// Upload and optimize an image
const item = await media.upload(buffer, 'diagram.png', {
  process: true,
  tags: ['math', 'algebra'],
});

// Deliver with proper headers
const response = await media.deliver(item.id);
```

## Documentation

- [README](README.md) - Full documentation
- [CONTRIBUTING](CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG](CHANGELOG.md) - Version history
- [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) - Community standards

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Part of the [Casuya Education Platform](https://github.com/casuya)**
