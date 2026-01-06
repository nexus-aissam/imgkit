<h1 align="center">
  ⚡ bun-image-turbo
</h1>

<p align="center">
  <strong>High-performance image processing for Bun and Node.js</strong><br>
  Built with Rust and napi-rs for maximum speed
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/bun-image-turbo"><img src="https://badge.fury.io/js/bun-image-turbo.svg" alt="npm version"></a>
  <a href="https://github.com/nexus-aissam/bun-image-turbo/actions/workflows/build.yml"><img src="https://github.com/nexus-aissam/bun-image-turbo/actions/workflows/build.yml/badge.svg" alt="Build & Publish"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js"></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-1.0+-orange.svg" alt="Bun"></a>
</p>

<p align="center">
  <a href="https://nexus-aissam.github.io/bun-image-turbo/"><img src="https://img.shields.io/badge/📖_Documentation-Visit_Docs-blue?style=for-the-badge" alt="Documentation"></a>
  <a href="https://nexus-aissam.github.io/bun-image-turbo/api/"><img src="https://img.shields.io/badge/📚_API-Reference-green?style=for-the-badge" alt="API Reference"></a>
  <a href="https://www.npmjs.com/package/bun-image-turbo"><img src="https://img.shields.io/badge/📦_npm-Package-red?style=for-the-badge" alt="npm Package"></a>
</p>

<p align="center">
  <b>Up to 950x faster</b> than alternatives • <b>Native HEIC support</b> • <b>EXIF metadata writing</b> • <b>SIMD-accelerated</b>
</p>

---

## Why bun-image-turbo?

| vs sharp | Speedup | Why |
|----------|:-------:|-----|
| WebP Metadata | **950x** | Header-only parsing, no decode |
| JPEG Metadata | **38x** | Optimized marker extraction |
| 50 Concurrent Ops | **2.6x** | Rayon thread pool |
| Transform Pipeline | **1.6x** | Single-pass processing |
| EXIF Write | **<0.3ms** | Native EXIF embedding |
| HEIC Support | **Exclusive** | Only lib with native HEIC |

> **bun-image-turbo** is the fastest image processing library for JavaScript. Period.

---

## Quick Links

| Resource | Link |
|----------|------|
| **Documentation** | [nexus-aissam.github.io/bun-image-turbo](https://nexus-aissam.github.io/bun-image-turbo/) |
| **API Reference** | [Full API Docs](https://nexus-aissam.github.io/bun-image-turbo/api/) |
| **Examples** | [Code Examples](https://nexus-aissam.github.io/bun-image-turbo/examples/) |
| **Getting Started** | [Installation Guide](https://nexus-aissam.github.io/bun-image-turbo/guide/) |
| **Architecture** | [Technical Deep Dive](https://nexus-aissam.github.io/bun-image-turbo/guide/architecture) |
| **Performance** | [Benchmarks & Optimization](https://nexus-aissam.github.io/bun-image-turbo/guide/performance) |
| **npm Package** | [npmjs.com/package/bun-image-turbo](https://www.npmjs.com/package/bun-image-turbo) |
| **GitHub** | [nexus-aissam/bun-image-turbo](https://github.com/nexus-aissam/bun-image-turbo) |
| **Changelog** | [Release Notes](https://nexus-aissam.github.io/bun-image-turbo/changelog) |

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

Prebuilt binaries are available for **all major platforms** - no compilation needed.

---

## Quick Start

```typescript
import { metadata, resize, transform, toWebp, blurhash, writeExif } from 'bun-image-turbo';

// Read image
const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());

// Get metadata (ultra-fast, header-only)
const info = await metadata(buffer);
console.log(`${info.width}x${info.height} ${info.format}`);

// Resize with shrink-on-decode optimization
const thumbnail = await resize(buffer, { width: 200 });

// Convert to WebP (50-80% smaller than JPEG)
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

// Add EXIF metadata (perfect for AI images)
const withExif = await writeExif(webp, {
  imageDescription: 'AI-generated sunset',
  artist: 'Stable Diffusion XL',
  software: 'ComfyUI',
  userComment: JSON.stringify({ prompt: '...', seed: 12345 })
});

// Save result
await Bun.write('output.webp', withExif);
```

**[See more examples →](https://nexus-aissam.github.io/bun-image-turbo/examples/)**

---

## Benchmarks

Tested on Apple M1 Pro with Bun 1.3.3 (compared to sharp v0.34.5):

### Metadata Extraction

| Operation | bun-image-turbo | sharp | Speedup |
|-----------|---------------:|------:|:-------:|
| WebP Metadata | **0.004ms** | 3.4ms | **950x** |
| JPEG Metadata | **0.003ms** | 0.1ms | **38x** |
| PNG Metadata | **0.002ms** | 0.08ms | **40x** |

### Image Processing

| Operation | bun-image-turbo | sharp | Speedup |
|-----------|---------------:|------:|:-------:|
| 50 Concurrent Ops | **62ms** | 160ms | **2.6x** |
| Transform Pipeline | **12.2ms** | 19.1ms | **1.6x** |
| 1MB JPEG → 800px | **12.6ms** | 20.3ms | **1.6x** |
| Thumbnail (200px) | **8.8ms** | 10.7ms | **1.2x** |

### HEIC Support (Exclusive)

| Operation | Time | Notes |
|-----------|-----:|:------|
| HEIC Metadata | **0.1ms** | Header-only parsing |
| HEIC → JPEG | **169ms** | Full quality conversion |
| HEIC → 800px | **138ms** | Shrink-on-decode |
| HEIC → Thumbnail | **137ms** | Fast 200px generation |

> **sharp does NOT support HEIC/HEIF files!** bun-image-turbo is the only high-performance library with native HEIC support.

### EXIF Metadata (NEW in v1.3.0)

| Operation | JPEG | WebP | Notes |
|-----------|-----:|-----:|:------|
| writeExif (simple) | **0.24ms** | **0.10ms** | 3 fields |
| writeExif (full) | **0.20ms** | **0.05ms** | 10 fields + JSON |
| stripExif | **0.26ms** | **0.08ms** | Remove all metadata |

> **Perfect for AI-generated images!** Store prompts, seeds, and generation parameters in standard EXIF fields.

**[Full benchmark details →](https://nexus-aissam.github.io/bun-image-turbo/guide/performance)**

---

## Technology Stack

| Component | Technology | Benefit |
|-----------|------------|---------|
| **JPEG Codec** | TurboJPEG (libjpeg-turbo) | SIMD acceleration (SSE2/AVX2/NEON) |
| **Resize Engine** | fast_image_resize + Rayon | Multi-threaded with adaptive algorithms |
| **WebP Codec** | libwebp bindings | Google's optimized encoder/decoder |
| **HEIC Decoder** | libheif-rs | Native Apple format support |
| **Node Bindings** | napi-rs | Zero-copy buffer handling |

**[Architecture deep dive →](https://nexus-aissam.github.io/bun-image-turbo/guide/architecture)**

---

## Features

- **TurboJPEG with SIMD** - 2-6x faster JPEG encoding/decoding via libjpeg-turbo
- **Shrink-on-Decode** - Decode JPEG/HEIC at reduced resolution for faster thumbnails
- **Adaptive Algorithms** - Auto-selects optimal resize filter based on scale factor
- **Native HEIC Support** - The only high-performance library with HEIC/HEIF decoding
- **EXIF Metadata Writing** - Write/strip EXIF data for AI image attribution
- **Blurhash Generation** - Built-in compact placeholder generation
- **Multi-Step Resize** - Progressive halving for large scale reductions
- **Async & Sync APIs** - Both async and sync versions available
- **TypeScript First** - Full TypeScript support with strict types
- **Cross-Platform** - macOS, Linux, Windows support

---

## API Overview

| Function | Description | Docs |
|----------|-------------|------|
| `metadata()` | Get image info (ultra-fast) | [→](https://nexus-aissam.github.io/bun-image-turbo/api/metadata) |
| `resize()` | Resize image (outputs PNG) | [→](https://nexus-aissam.github.io/bun-image-turbo/api/resize) |
| `transform()` | Multi-operation pipeline | [→](https://nexus-aissam.github.io/bun-image-turbo/api/transform) |
| `toJpeg()` | Convert to JPEG | [→](https://nexus-aissam.github.io/bun-image-turbo/api/to-jpeg) |
| `toPng()` | Convert to PNG | [→](https://nexus-aissam.github.io/bun-image-turbo/api/to-png) |
| `toWebp()` | Convert to WebP | [→](https://nexus-aissam.github.io/bun-image-turbo/api/to-webp) |
| `blurhash()` | Generate placeholder hash | [→](https://nexus-aissam.github.io/bun-image-turbo/api/blurhash) |
| `writeExif()` | Write EXIF metadata | [→](https://nexus-aissam.github.io/bun-image-turbo/api/exif) |
| `stripExif()` | Remove EXIF metadata | [→](https://nexus-aissam.github.io/bun-image-turbo/api/exif) |

All functions have sync variants (`metadataSync`, `resizeSync`, `writeExifSync`, etc.)

**[Full API Reference →](https://nexus-aissam.github.io/bun-image-turbo/api/)**

---

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

**[Format guide →](https://nexus-aissam.github.io/bun-image-turbo/guide/formats)**

---

## Platform Support

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

> **Note:** HEIC/HEIF decoding is only available on macOS ARM64. All other formats work on all platforms.

---

## Examples

```bash
cd examples
bun install

bun run basic    # Core functionality
bun run heic     # HEIC conversion (macOS ARM64)
bun run api      # HTTP image server
bun run batch    # Parallel batch processing
```

| Example | Description |
|---------|-------------|
| [basic-usage.ts](./examples/basic-usage.ts) | Metadata, resize, convert, transform |
| [heic-conversion.ts](./examples/heic-conversion.ts) | iPhone photo conversion |
| [api-endpoint.ts](./examples/api-endpoint.ts) | HTTP image processing server |
| [batch-processing.ts](./examples/batch-processing.ts) | Parallel multi-file processing |

### EXIF Metadata Example

```typescript
import { writeExif, toWebp, stripExif } from 'bun-image-turbo';

// Add AI generation metadata to WebP
const webp = await toWebp(imageBuffer, { quality: 90 });
const withMetadata = await writeExif(webp, {
  imageDescription: 'A sunset over mountains',
  artist: 'Stable Diffusion XL',
  software: 'ComfyUI',
  userComment: JSON.stringify({
    prompt: 'sunset over mountains, 8k',
    seed: 12345,
    steps: 30,
    cfg_scale: 7.5
  })
});

// Strip metadata for privacy
const clean = await stripExif(photoWithGPS);
```

**[All examples →](https://nexus-aissam.github.io/bun-image-turbo/examples/)**

---

## Documentation

<table>
<tr>
<td width="50%">

### Online Documentation

Full documentation with examples, API reference, and guides:

**[nexus-aissam.github.io/bun-image-turbo](https://nexus-aissam.github.io/bun-image-turbo/)**

- [Getting Started](https://nexus-aissam.github.io/bun-image-turbo/guide/)
- [API Reference](https://nexus-aissam.github.io/bun-image-turbo/api/)
- [Examples](https://nexus-aissam.github.io/bun-image-turbo/examples/)
- [Architecture](https://nexus-aissam.github.io/bun-image-turbo/guide/architecture)
- [Performance](https://nexus-aissam.github.io/bun-image-turbo/guide/performance)

</td>
<td width="50%">

### Offline Documentation

Documentation is also available in the [`docs/`](./docs/) folder:

- [Guide](./docs/guide/)
- [API](./docs/api/)
- [Examples](./docs/examples/)

View locally:

```bash
cd docs
bun install
bun run docs:dev
```

</td>
</tr>
</table>

---

## Contributing

```bash
# Clone
git clone https://github.com/nexus-aissam/bun-image-turbo.git
cd bun-image-turbo

# Install dependencies
bun install

# Build native module (requires Rust 1.70+)
bun run build

# Build TypeScript
bun run build:ts

# Run tests
bun test test/
```

### Requirements

- Bun 1.0+ or Node.js 18+
- Rust 1.70+ (for building from source)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**Aissam Irhir** ([@nexus-aissam](https://github.com/nexus-aissam))

---

## Acknowledgments

- [turbojpeg](https://crates.io/crates/turbojpeg) - libjpeg-turbo bindings with SIMD
- [image](https://crates.io/crates/image) - Rust image processing library
- [fast_image_resize](https://crates.io/crates/fast_image_resize) - Fast image resizing with Rayon
- [webp](https://crates.io/crates/webp) - WebP encoding/decoding
- [libheif-rs](https://crates.io/crates/libheif-rs) - HEIC/HEIF decoding via libheif
- [img-parts](https://crates.io/crates/img-parts) - EXIF/XMP metadata manipulation
- [blurhash](https://crates.io/crates/blurhash) - Blurhash generation
- [napi-rs](https://napi.rs/) - Rust bindings for Node.js

---

<p align="center">
  <a href="https://nexus-aissam.github.io/bun-image-turbo/">Documentation</a> •
  <a href="https://nexus-aissam.github.io/bun-image-turbo/api/">API</a> •
  <a href="https://www.npmjs.com/package/bun-image-turbo">npm</a> •
  <a href="https://github.com/nexus-aissam/bun-image-turbo">GitHub</a>
</p>
