# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-05

### Added

#### Core
- Initial release of casuya-media
- MediaFactory unified facade API
- TypeScript type definitions for all modules

#### Image Processing
- Image compression with Sharp (JPEG, PNG, WebP, AVIF)
- Image resizing with aspect ratio preservation
- Thumbnail generation (standard sets: 150x150, 300x300, 600x400, 1200x800)
- Image optimization for web and mobile
- Auto-optimization pipeline

#### Video Processing
- Video transcoding via FFmpeg (MP4, WebM, OGV)
- Video compression with CRF and bitrate control
- Video thumbnail generation (time-based)
- HLS adaptive streaming generation
- Mobile-optimized video presets

#### Audio Processing
- Audio transcoding (MP3, AAC, OGG, FLAC, M4A)
- Audio compression with bitrate control
- Audio normalization (loudness normalization)
- Audio trimming
- Metadata extraction (ID3 tags, etc.)

#### Delivery
- Range request support for video/audio streaming
- CORS headers for cross-origin access
- Network-aware quality optimization (2G/3G/4G/WiFi)
- Cache-Control header generation

#### Caching
- In-memory LRU cache with TTL
- Disk-based cache persistence
- Configurable max size and eviction
- Cache statistics and monitoring

#### Metadata
- Indexed metadata storage
- Search by category, format, tags, lesson, school
- Tag management (add, remove, update)
- Storage statistics

#### Storage
- Indexed file storage
- Media variants (thumbnails, processed versions)
- File copy and management
- Storage statistics

#### Utilities
- Structured logging system
- Input validation helpers
- Format detection and conversion
- File system utilities

#### Error Handling
- Typed error hierarchy
- HTTP status code mapping
- Detailed error messages

#### Testing
- Unit tests for core functionality
- 78 passing tests
- Jest test framework

#### Documentation
- Comprehensive README
- Contributing guidelines
- Code of conduct
- MIT License
