# bun-image-turbo

High-performance image processing for Bun and Node.js, built with Rust and napi-rs.

[![npm version](https://badge.fury.io/js/bun-image-turbo.svg)](https://www.npmjs.com/package/bun-image-turbo)
[![Build & Publish](https://github.com/nexus-aissam/bun-image-turbo/actions/workflows/build.yml/badge.svg)](https://github.com/nexus-aissam/bun-image-turbo/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange.svg)](https://bun.sh/)

## Why bun-image-turbo?

Built from the ground up for **maximum performance**, bun-image-turbo uses native Rust with carefully optimized codepaths:

| Component | Technology | Benefit |
|-----------|------------|---------|
| **JPEG Codec** | TurboJPEG (libjpeg-turbo) | SIMD acceleration (SSE2/AVX2/NEON) |
| **Resize Engine** | fast_image_resize + Rayon | Multi-threaded with adaptive algorithms |
| **WebP Codec** | libwebp bindings | Google's optimized encoder/decoder |
| **HEIC Decoder** | libheif-rs | Native Apple format support |
| **Node Bindings** | napi-rs | Zero-copy buffer handling |

## Features

- **TurboJPEG with SIMD** - 2-6x faster JPEG encoding/decoding via libjpeg-turbo
- **Shrink-on-Decode** - Decode JPEG/HEIC at reduced resolution for faster thumbnails
- **Adaptive Algorithms** - Auto-selects optimal resize filter based on scale factor
- **Native HEIC Support** - The only high-performance library with HEIC/HEIF decoding
- **Blurhash Generation** - Built-in compact placeholder generation
- **Multi-Step Resize** - Progressive halving for large scale reductions
- **Async & Sync APIs** - Both async and sync versions available
- **TypeScript First** - Full TypeScript support with strict types
- **Cross-Platform** - macOS, Linux, Windows support

## Benchmarks

Tested on Apple M1 Pro with Bun 1.3.3 (compared to sharp v0.34.5):

| Operation | bun-image-turbo | sharp | Speedup |
|-----------|---------------:|------:|:-------:|
| **WebP Metadata** | 0.004ms | 3.4ms | **950x** |
| **JPEG Metadata** | 0.003ms | 0.1ms | **38x** |
| **50 Concurrent Ops** | 62ms | 160ms | **2.6x** |
| **Transform Pipeline** | 12.2ms | 19.1ms | **1.6x** |
| **1MB JPEG → 800px** | 12.6ms | 20.3ms | **1.6x** |
| **Thumbnail (200px)** | 8.8ms | 10.7ms | **1.2x** |

### HEIC/HEIF Support (Exclusive)

bun-image-turbo is the **only** high-performance image library with native HEIC support:

| Operation | Time | Notes |
|-----------|-----:|:------|
| **HEIC Metadata** | 0.1ms | Header-only parsing |
| **HEIC → JPEG** | 169ms | Full quality conversion |
| **HEIC → 800px** | 138ms | Shrink-on-decode optimization |
| **HEIC → Thumbnail** | 137ms | Fast 200px generation |

> **Note:** sharp does NOT support HEIC/HEIF files!

## Installation

```bash
# Using Bun (recommended)
bun add bun-image-turbo

# Using npm
npm install bun-image-turbo

# Using yarn
yarn add bun-image-turbo

# Using pnpm
pnpm add bun-image-turbo
```

## Quick Start

```typescript
import { metadata, resize, transform, toWebp, blurhash } from 'bun-image-turbo';

// Read image
const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());

// Get metadata (header-only, ultra-fast)
const info = await metadata(buffer);
console.log(`${info.width}x${info.height} ${info.format}`);

// Resize with shrink-on-decode optimization
const thumbnail = await resize(buffer, { width: 200 });

// Convert to WebP
const webp = await toWebp(buffer, { quality: 85 });

// Full transform pipeline
const result = await transform(buffer, {
  resize: { width: 800, height: 600, fit: 'cover' },
  rotate: 90,
  grayscale: true,
  sharpen: 10,
  output: { format: 'webp', webp: { quality: 85 } }
});

// Generate blurhash placeholder
const { hash } = await blurhash(buffer, 4, 3);
console.log(hash); // "LEHV6nWB2yk8pyo0adR*.7kCMdnj"

// Save result
await Bun.write('output.webp', result);
```

### HEIC Conversion (macOS ARM64)

```typescript
import { toJpeg, metadata } from 'bun-image-turbo';

// Read iPhone photo
const heic = Buffer.from(await Bun.file('IMG_1234.HEIC').arrayBuffer());

// Get metadata
const info = await metadata(heic);
console.log(info.format); // 'heic'

// Convert to JPEG
const jpeg = await toJpeg(heic, { quality: 90 });
await Bun.write('photo.jpg', jpeg);
```

## API Reference

### `metadata(input)` / `metadataSync(input)`

Get image metadata without fully decoding. Ultra-fast header-only parsing.

```typescript
const info = await metadata(buffer);
// { width, height, format, channels, hasAlpha, ... }
```

### `resize(input, options)` / `resizeSync(input, options)`

Resize image with automatic shrink-on-decode optimization. **Returns PNG format.**

```typescript
const resized = await resize(buffer, {
  width: 800,
  height: 600,
  fit: 'cover',      // 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  filter: 'lanczos3' // 'nearest' | 'bilinear' | 'catmullRom' | 'mitchell' | 'lanczos3'
});

// For other output formats, use transform():
const jpeg = await transform(buffer, {
  resize: { width: 800 },
  output: { format: 'jpeg', jpeg: { quality: 85 } }
});
```

### `toJpeg(input, options?)` / `toJpegSync(input, options?)`

Convert to JPEG using TurboJPEG with SIMD acceleration.

```typescript
const jpeg = await toJpeg(buffer, { quality: 85 });
```

### `toPng(input, options?)` / `toPngSync(input, options?)`

Convert to PNG with adaptive compression.

```typescript
const png = await toPng(buffer, { compression: 6 });
```

### `toWebp(input, options?)` / `toWebpSync(input, options?)`

Convert to WebP (lossy or lossless).

```typescript
const webp = await toWebp(buffer, { quality: 80 });
const lossless = await toWebp(buffer, { lossless: true });
```

### `transform(input, options)` / `transformSync(input, options)`

Apply multiple transformations in a single operation.

```typescript
const result = await transform(buffer, {
  resize: { width: 800, height: 600, fit: 'cover' },
  rotate: 90,        // 90, 180, or 270 degrees
  flipH: true,       // Flip horizontally
  flipV: false,      // Flip vertically
  grayscale: true,   // Convert to grayscale
  blur: 5,           // Blur radius (0-100)
  sharpen: 10,       // Sharpen amount (0-100)
  brightness: 10,    // Brightness (-100 to 100)
  contrast: 5,       // Contrast (-100 to 100)
  output: {
    format: 'webp',
    webp: { quality: 85 }
  }
});
```

### `blurhash(input, componentsX?, componentsY?)` / `blurhashSync(...)`

Generate a compact blurhash placeholder string.

```typescript
const { hash, width, height } = await blurhash(buffer, 4, 3);
```

### `version()`

Get the library version.

```typescript
import { version } from 'bun-image-turbo';
console.log(version()); // "1.2.1"
```

## Supported Formats

| Format | Read | Write | Notes |
|--------|:----:|:-----:|-------|
| JPEG | ✅ | ✅ | TurboJPEG with SIMD |
| PNG | ✅ | ✅ | Adaptive compression |
| WebP | ✅ | ✅ | Lossy & lossless |
| HEIC/HEIF | ✅ | ❌ | macOS ARM64 only |
| AVIF | ✅ | ❌ | Via libheif |
| GIF | ✅ | ✅ | Animated support |
| BMP | ✅ | ✅ | Full support |
| TIFF | ✅ | ❌ | Multi-page support |
| ICO | ✅ | ❌ | Multi-size icons |

## Supported Platforms

Prebuilt binaries are available for all major platforms:

| Platform | Architecture | Supported | HEIC |
|----------|--------------|:---------:|:----:|
| macOS | ARM64 (M1/M2/M3/M4/M5) | ✅ | ✅ |
| macOS | x64 (Intel) | ✅ | ❌ |
| Linux | x64 (glibc) | ✅ | ❌ |
| Linux | x64 (musl/Alpine) | ✅ | ❌ |
| Linux | ARM64 (glibc) | ✅ | ❌ |
| Windows | x64 | ✅ | ❌ |
| Windows | ARM64 | ✅ | ❌ |

> **Note:** HEIC/HEIF decoding is only available on macOS ARM64. All other image formats work on all platforms.

## Examples

The [`examples/`](./examples/) folder contains standalone examples:

```bash
cd examples
bun install

# Basic usage - metadata, resize, convert, transform, blurhash
bun run basic

# HEIC conversion - convert iPhone photos (macOS ARM64 only)
bun run heic

# API endpoint - HTTP server for on-the-fly image processing
bun run api

# Batch processing - process multiple images in parallel
bun run batch ./input ./output
```

| File | Description |
|------|-------------|
| [`basic-usage.ts`](./examples/basic-usage.ts) | Core functionality demo |
| [`heic-conversion.ts`](./examples/heic-conversion.ts) | HEIC/HEIF conversion |
| [`api-endpoint.ts`](./examples/api-endpoint.ts) | HTTP image processing server |
| [`batch-processing.ts`](./examples/batch-processing.ts) | Parallel batch processing |

## Documentation

Full documentation is available at **[https://nexus-aissam.github.io/bun-image-turbo](https://nexus-aissam.github.io/bun-image-turbo)**

- [Getting Started](https://nexus-aissam.github.io/bun-image-turbo/guide/)
- [API Reference](https://nexus-aissam.github.io/bun-image-turbo/api/)
- [Examples](https://nexus-aissam.github.io/bun-image-turbo/examples/)

## Development

```bash
# Clone the repository
git clone https://github.com/nexus-aissam/bun-image-turbo.git
cd bun-image-turbo

# Install dependencies
bun install

# Build native module (requires Rust)
bun run build

# Build TypeScript
bun run build:ts

# Run tests
bun test test/
```

### Requirements

- Bun 1.0+ or Node.js 18+
- Rust 1.70+ (for building from source)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Aissam Irhir ([@nexus-aissam](https://github.com/nexus-aissam))

## Acknowledgments

- [turbojpeg](https://crates.io/crates/turbojpeg) - libjpeg-turbo bindings with SIMD
- [image](https://crates.io/crates/image) - Rust image processing library
- [fast_image_resize](https://crates.io/crates/fast_image_resize) - Fast image resizing with Rayon
- [webp](https://crates.io/crates/webp) - WebP encoding/decoding
- [libheif-rs](https://crates.io/crates/libheif-rs) - HEIC/HEIF decoding via libheif
- [blurhash](https://crates.io/crates/blurhash) - Blurhash generation
- [napi-rs](https://napi.rs/) - Rust bindings for Node.js
