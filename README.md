# bun-image-turbo

**High-performance image processing for Bun and Node.js** — Built with Rust and napi-rs for maximum speed.

[![npm version](https://badge.fury.io/js/bun-image-turbo.svg)](https://www.npmjs.com/package/bun-image-turbo)
[![Build & Publish](https://github.com/nexus-aissam/bun-image-turbo/actions/workflows/build.yml/badge.svg)](https://github.com/nexus-aissam/bun-image-turbo/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange.svg)](https://bun.sh/)

---

## Why bun-image-turbo?

- **Up to 950x faster** than alternatives for metadata extraction
- **Native HEIC/HEIF support** — The only high-performance library with Apple format decoding
- **EXIF metadata writing** — Perfect for AI-generated image attribution
- **SIMD-accelerated** — TurboJPEG with SSE2/AVX2/NEON
- **Zero dependencies** — Prebuilt binaries, no compilation needed

### Performance Highlights

| Operation | vs sharp | Details |
|-----------|:--------:|---------|
| WebP Metadata | **950x faster** | Header-only parsing |
| JPEG Metadata | **38x faster** | Optimized marker extraction |
| WebP Resize | **1.25x faster** | Shrink-on-load optimization |
| Concurrent Ops | **2.6x faster** | Rayon thread pool |
| HEIC Support | **Exclusive** | Only lib with native HEIC |

---

## Installation

```bash
# Bun (recommended)
bun add bun-image-turbo

# npm
npm install bun-image-turbo

# yarn
yarn add bun-image-turbo

# pnpm
pnpm add bun-image-turbo
```

### Verified Package Managers

| Package Manager | Status | Tests |
|-----------------|:------:|------:|
| Bun | ✅ | 39 pass |
| npm | ✅ | 32 pass |
| yarn | ✅ | 32 pass |
| pnpm | ✅ | 32 pass |

---

## Quick Start

```typescript
import {
  metadata,
  resize,
  transform,
  toWebp,
  blurhash,
  writeExif
} from 'bun-image-turbo';

// Load image
const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());

// Get metadata (ultra-fast, header-only parsing)
const info = await metadata(buffer);
console.log(`${info.width}x${info.height} ${info.format}`);

// Resize with shrink-on-decode optimization
const thumbnail = await resize(buffer, { width: 200 });

// Convert to WebP (50-80% smaller than JPEG)
const webp = await toWebp(buffer, { quality: 85 });

// Full transform pipeline
const result = await transform(buffer, {
  resize: { width: 800, height: 600, fit: 'Cover' },
  rotate: 90,
  grayscale: true,
  output: { format: 'Webp', webp: { quality: 85 } }
});

// Generate blurhash placeholder
const { hash } = await blurhash(buffer, 4, 3);

// Add EXIF metadata (perfect for AI-generated images)
const withExif = await writeExif(webp, {
  imageDescription: 'AI-generated landscape',
  artist: 'Stable Diffusion XL',
  software: 'ComfyUI',
  userComment: JSON.stringify({ prompt: '...', seed: 12345 })
});
```

---

## API Reference

### Core Functions

| Function | Description | Async | Sync |
|----------|-------------|:-----:|:----:|
| `metadata()` | Get image dimensions, format, color info | ✅ | ✅ |
| `resize()` | Resize image (outputs PNG) | ✅ | ✅ |
| `transform()` | Multi-operation pipeline | ✅ | ✅ |
| `toJpeg()` | Convert to JPEG | ✅ | ✅ |
| `toPng()` | Convert to PNG | ✅ | ✅ |
| `toWebp()` | Convert to WebP | ✅ | ✅ |
| `blurhash()` | Generate placeholder hash | ✅ | ✅ |
| `writeExif()` | Write EXIF metadata | ✅ | ✅ |
| `stripExif()` | Remove EXIF metadata | ✅ | ✅ |

### Sync Variants

All functions have synchronous versions: `metadataSync()`, `resizeSync()`, `transformSync()`, etc.

---

## Supported Formats

| Format | Read | Write | Notes |
|--------|:----:|:-----:|-------|
| JPEG | ✅ | ✅ | TurboJPEG with SIMD acceleration |
| PNG | ✅ | ✅ | Adaptive compression |
| WebP | ✅ | ✅ | Lossy & lossless modes |
| HEIC/HEIF | ✅ | — | macOS ARM64 only |
| AVIF | ✅ | — | Via libheif |
| GIF | ✅ | ✅ | Full support |
| BMP | ✅ | ✅ | Full support |
| TIFF | ✅ | — | Read-only |
| ICO | ✅ | — | Read-only |

---

## Platform Support

| Platform | Architecture | Status | HEIC |
|----------|--------------|:------:|:----:|
| macOS | ARM64 (M1/M2/M3/M4) | ✅ | ✅ |
| macOS | x64 (Intel) | ✅ | — |
| Linux | x64 (glibc) | ✅ | — |
| Linux | x64 (musl/Alpine) | ✅ | — |
| Linux | ARM64 | ✅ | — |
| Windows | x64 | ✅ | — |
| Windows | ARM64 | ✅ | — |

> **Note:** HEIC/HEIF decoding requires macOS ARM64 with libheif installed via Homebrew.

---

## Benchmarks

Tested on Apple M1 Pro, Bun 1.3.3, compared to sharp v0.34.5:

### Metadata Extraction

| Format | bun-image-turbo | sharp | Speedup |
|--------|----------------:|------:|:-------:|
| WebP | 0.004ms | 3.4ms | **950x** |
| JPEG | 0.003ms | 0.1ms | **38x** |
| PNG | 0.002ms | 0.08ms | **40x** |

### Image Processing

| Operation | bun-image-turbo | sharp | Speedup |
|-----------|----------------:|------:|:-------:|
| 50 Concurrent Ops | 62ms | 160ms | **2.6x** |
| Transform Pipeline | 12.2ms | 19.1ms | **1.6x** |
| 1MB JPEG → 800px | 12.6ms | 20.3ms | **1.6x** |

### WebP Resize (v1.4.0+)

| Source → Target | bun-image-turbo | sharp | Speedup |
|-----------------|----------------:|------:|:-------:|
| 800x600 → 200px | 3.1ms | 4.3ms | **1.40x** |
| 1600x1200 → 200px | 6.4ms | 8.0ms | **1.24x** |
| 4000x3000 → 400px | 32.4ms | 33.1ms | **1.02x** |

---

## Examples

### Basic Usage

```typescript
import { metadata, resize, toWebp } from 'bun-image-turbo';

const buffer = await Bun.file('input.jpg').arrayBuffer();
const input = Buffer.from(buffer);

// Get image info
const info = await metadata(input);
console.log(info); // { width: 1920, height: 1080, format: 'Jpeg', ... }

// Create thumbnail
const thumb = await resize(input, { width: 200, height: 200, fit: 'Cover' });

// Convert to WebP
const webp = await toWebp(input, { quality: 85 });
await Bun.write('output.webp', webp);
```

### HEIC Conversion (macOS ARM64)

```typescript
import { metadata, transform } from 'bun-image-turbo';

const heic = Buffer.from(await Bun.file('IMG_1234.HEIC').arrayBuffer());

// Check format
const info = await metadata(heic);
console.log(info.format); // 'Heic'

// Convert to JPEG
const jpeg = await transform(heic, {
  output: { format: 'Jpeg', jpeg: { quality: 90 } }
});
```

### EXIF Metadata for AI Images

```typescript
import { writeExif, toWebp } from 'bun-image-turbo';

const webp = await toWebp(aiGeneratedImage, { quality: 90 });

const withMetadata = await writeExif(webp, {
  imageDescription: 'A sunset over mountains',
  artist: 'Stable Diffusion XL',
  software: 'ComfyUI v1.0',
  copyright: '© 2024 Your Name',
  userComment: JSON.stringify({
    prompt: 'sunset over mountains, golden hour, 8k',
    negativePrompt: 'blur, noise',
    seed: 12345,
    steps: 30,
    cfg_scale: 7.5
  })
});
```

### HTTP Image Server

```typescript
import { resize, toWebp, metadata } from 'bun-image-turbo';

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/resize') {
      const imageUrl = url.searchParams.get('url');
      const width = parseInt(url.searchParams.get('w') || '400');

      const response = await fetch(imageUrl!);
      const buffer = Buffer.from(await response.arrayBuffer());

      const resized = await resize(buffer, { width });
      const webp = await toWebp(resized, { quality: 85 });

      return new Response(webp, {
        headers: { 'Content-Type': 'image/webp' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
});
```

---

## Development

```bash
# Clone repository
git clone https://github.com/nexus-aissam/bun-image-turbo.git
cd bun-image-turbo

# Install dependencies
bun install

# Build native module (requires Rust 1.70+)
bun run build

# Build TypeScript
bun run build:ts

# Run tests
bun run test              # Local tests
bun run test:packages     # Package manager tests
bun run test:all          # All tests
```

### Requirements

- **Runtime:** Bun 1.0+ or Node.js 18+
- **Build:** Rust 1.70+ (only for building from source)

---

## Documentation

- **[Full Documentation](https://nexus-aissam.github.io/bun-image-turbo/)** — Complete guide with examples
- **[API Reference](https://nexus-aissam.github.io/bun-image-turbo/api/)** — Detailed function documentation
- **[Examples](https://nexus-aissam.github.io/bun-image-turbo/examples/)** — Code samples
- **[Performance Guide](https://nexus-aissam.github.io/bun-image-turbo/guide/performance)** — Optimization tips
- **[Architecture](https://nexus-aissam.github.io/bun-image-turbo/guide/architecture)** — Technical deep dive
- **[Changelog](https://nexus-aissam.github.io/bun-image-turbo/changelog)** — Release notes

---

## Technology Stack

| Component | Technology | Benefit |
|-----------|------------|---------|
| JPEG Codec | TurboJPEG | SIMD acceleration (SSE2/AVX2/NEON) |
| Resize Engine | fast_image_resize | Multi-threaded with Rayon |
| WebP Codec | libwebp | Google's optimized encoder |
| HEIC Decoder | libheif-rs | Native Apple format support |
| Node Bindings | napi-rs | Zero-copy buffer handling |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

**Aissam Irhir** — [@nexus-aissam](https://github.com/nexus-aissam)

---

## Links

- [npm Package](https://www.npmjs.com/package/bun-image-turbo)
- [GitHub Repository](https://github.com/nexus-aissam/bun-image-turbo)
- [Documentation](https://nexus-aissam.github.io/bun-image-turbo/)
- [Issue Tracker](https://github.com/nexus-aissam/bun-image-turbo/issues)
