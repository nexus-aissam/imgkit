<div align="center">

# bun-image-turbo

**High-performance image processing for Bun and Node.js**

*Built with Rust and napi-rs for maximum speed*

[![npm version](https://img.shields.io/npm/v/bun-image-turbo?style=flat-square&color=f97316)](https://www.npmjs.com/package/bun-image-turbo)
[![downloads](https://img.shields.io/npm/dm/bun-image-turbo?style=flat-square&color=10b981)](https://www.npmjs.com/package/bun-image-turbo)
[![CI](https://img.shields.io/github/actions/workflow/status/nexus-aissam/bun-image-turbo/ci.yml?style=flat-square&label=CI)](https://github.com/nexus-aissam/bun-image-turbo/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

<br />

[Documentation](https://nexus-aissam.github.io/bun-image-turbo/) · [API Reference](https://nexus-aissam.github.io/bun-image-turbo/api/) · [Examples](https://nexus-aissam.github.io/bun-image-turbo/examples/) · [Changelog](https://nexus-aissam.github.io/bun-image-turbo/changelog)

</div>

<br />

## Highlights

<table>
<tr>
<td width="50%">

### Performance

- **950x faster** metadata extraction
- **2.6x faster** concurrent operations
- **SIMD-accelerated** JPEG codec
- **Zero-copy** buffer handling

</td>
<td width="50%">

### Features

- **Native HEIC/HEIF** support
- **ThumbHash & BlurHash** placeholders
- **EXIF metadata** read/write
- **Zero dependencies** runtime

</td>
</tr>
</table>

<br />

## Installation

```bash
# Bun (recommended)
bun add bun-image-turbo

# npm / yarn / pnpm
npm install bun-image-turbo
```

<details>
<summary><strong>Verified Package Managers</strong></summary>

| Package Manager | Status | Tests |
|-----------------|:------:|------:|
| Bun | ✅ | 56 pass |
| npm | ✅ | 32 pass |
| yarn | ✅ | 32 pass |
| pnpm | ✅ | 32 pass |

</details>

<br />

## Quick Start

```typescript
import {
  metadata,
  resize,
  toWebp,
  thumbhash,
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

// Generate ThumbHash placeholder (better than BlurHash)
const { dataUrl } = await thumbhash(buffer);
// Use directly: <img src={dataUrl} />

// Add EXIF metadata (perfect for AI images)
const withExif = await writeExif(webp, {
  artist: 'Stable Diffusion XL',
  software: 'ComfyUI'
});
```

<br />

## API Reference

<table>
<thead>
<tr>
<th>Function</th>
<th>Description</th>
<th align="center">Async</th>
<th align="center">Sync</th>
</tr>
</thead>
<tbody>
<tr><td><code>metadata()</code></td><td>Get image dimensions, format, color info</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>resize()</code></td><td>Resize image with multiple algorithms</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>transform()</code></td><td>Multi-operation pipeline</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>toJpeg()</code></td><td>Convert to JPEG</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>toPng()</code></td><td>Convert to PNG</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>toWebp()</code></td><td>Convert to WebP</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>blurhash()</code></td><td>Generate BlurHash placeholder</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>thumbhash()</code></td><td>Generate ThumbHash placeholder</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>writeExif()</code></td><td>Write EXIF metadata</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td><code>stripExif()</code></td><td>Remove EXIF metadata</td><td align="center">✅</td><td align="center">✅</td></tr>
</tbody>
</table>

> **Note:** All functions have sync variants: `metadataSync()`, `resizeSync()`, etc.

<br />

## Image Placeholders

<table>
<tr>
<th width="50%">ThumbHash <sup>NEW</sup></th>
<th width="50%">BlurHash</th>
</tr>
<tr>
<td>

```typescript
const { dataUrl, hash } = await thumbhash(buffer);

// Ready-to-use data URL
element.style.backgroundImage = `url(${dataUrl})`;

// Or store the compact hash (~25 bytes)
await db.save({ thumbhash: hash });
```

</td>
<td>

```typescript
const { hash } = await blurhash(buffer, 4, 3);

// Returns base83 string
console.log(hash);
// "LEHV6nWB2yk8pyo0adR*.7kCMdnj"
```

</td>
</tr>
<tr>
<td>

**Advantages:**
- Alpha channel support
- Aspect ratio preserved
- Better color accuracy
- Smoother gradients

</td>
<td>

**Advantages:**
- Widely supported
- Compact string format
- Good for simple images

</td>
</tr>
</table>

<br />

## Supported Formats

<table>
<thead>
<tr>
<th>Format</th>
<th align="center">Read</th>
<th align="center">Write</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
<tr><td><strong>JPEG</strong></td><td align="center">✅</td><td align="center">✅</td><td>TurboJPEG with SIMD acceleration</td></tr>
<tr><td><strong>PNG</strong></td><td align="center">✅</td><td align="center">✅</td><td>Adaptive compression</td></tr>
<tr><td><strong>WebP</strong></td><td align="center">✅</td><td align="center">✅</td><td>Lossy & lossless modes</td></tr>
<tr><td><strong>HEIC/HEIF</strong></td><td align="center">✅</td><td align="center">—</td><td>macOS ARM64 only</td></tr>
<tr><td><strong>AVIF</strong></td><td align="center">✅</td><td align="center">—</td><td>Via libheif</td></tr>
<tr><td><strong>GIF</strong></td><td align="center">✅</td><td align="center">✅</td><td>Full support</td></tr>
<tr><td><strong>BMP</strong></td><td align="center">✅</td><td align="center">✅</td><td>Full support</td></tr>
<tr><td><strong>TIFF</strong></td><td align="center">✅</td><td align="center">—</td><td>Read-only</td></tr>
</tbody>
</table>

<br />

## Platform Support

<table>
<thead>
<tr>
<th>Platform</th>
<th>Architecture</th>
<th align="center">Status</th>
<th align="center">HEIC</th>
</tr>
</thead>
<tbody>
<tr><td>macOS</td><td>ARM64 (Apple Silicon)</td><td align="center">✅</td><td align="center">✅</td></tr>
<tr><td>macOS</td><td>x64 (Intel)</td><td align="center">✅</td><td align="center">—</td></tr>
<tr><td>Linux</td><td>x64 (glibc)</td><td align="center">✅</td><td align="center">—</td></tr>
<tr><td>Linux</td><td>x64 (musl/Alpine)</td><td align="center">✅</td><td align="center">—</td></tr>
<tr><td>Linux</td><td>ARM64</td><td align="center">✅</td><td align="center">—</td></tr>
<tr><td>Windows</td><td>x64</td><td align="center">✅</td><td align="center">—</td></tr>
<tr><td>Windows</td><td>ARM64</td><td align="center">✅</td><td align="center">—</td></tr>
</tbody>
</table>

<br />

## Performance Benchmarks

<details open>
<summary><strong>Metadata Extraction</strong></summary>

| Format | bun-image-turbo | sharp | Speedup |
|--------|----------------:|------:|:-------:|
| WebP | 0.004ms | 3.4ms | **950x** |
| JPEG | 0.003ms | 0.1ms | **38x** |
| PNG | 0.002ms | 0.08ms | **40x** |

</details>

<details>
<summary><strong>Image Processing</strong></summary>

| Operation | bun-image-turbo | sharp | Speedup |
|-----------|----------------:|------:|:-------:|
| 50 Concurrent Ops | 62ms | 160ms | **2.6x** |
| Transform Pipeline | 12.2ms | 19.1ms | **1.6x** |
| 1MB JPEG → 800px | 12.6ms | 20.3ms | **1.6x** |

</details>

<details>
<summary><strong>WebP Resize</strong></summary>

| Source → Target | bun-image-turbo | sharp | Speedup |
|-----------------|----------------:|------:|:-------:|
| 800x600 → 200px | 3.1ms | 4.3ms | **1.40x** |
| 1600x1200 → 200px | 6.4ms | 8.0ms | **1.24x** |
| 4000x3000 → 400px | 32.4ms | 33.1ms | **1.02x** |

</details>

<br />

## Examples

<details>
<summary><strong>Basic Usage</strong></summary>

```typescript
import { metadata, resize, toWebp } from 'bun-image-turbo';

const input = Buffer.from(await Bun.file('input.jpg').arrayBuffer());

// Get image info
const info = await metadata(input);
console.log(info); // { width: 1920, height: 1080, format: 'jpeg', ... }

// Create thumbnail
const thumb = await resize(input, { width: 200, height: 200, fit: 'Cover' });

// Convert to WebP
const webp = await toWebp(input, { quality: 85 });
await Bun.write('output.webp', webp);
```

</details>

<details>
<summary><strong>HEIC Conversion (macOS ARM64)</strong></summary>

```typescript
import { metadata, transform } from 'bun-image-turbo';

const heic = Buffer.from(await Bun.file('IMG_1234.HEIC').arrayBuffer());

// Check format
const info = await metadata(heic);
console.log(info.format); // 'heic'

// Convert to JPEG
const jpeg = await transform(heic, {
  output: { format: 'Jpeg', jpeg: { quality: 90 } }
});
```

</details>

<details>
<summary><strong>EXIF Metadata for AI Images</strong></summary>

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
    seed: 12345,
    steps: 30
  })
});
```

</details>

<details>
<summary><strong>HTTP Image Server</strong></summary>

```typescript
import { resize, toWebp } from 'bun-image-turbo';

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

</details>

<br />

## Technology Stack

| Component | Technology | Benefit |
|-----------|------------|---------|
| JPEG Codec | TurboJPEG | SIMD acceleration (SSE2/AVX2/NEON) |
| Resize Engine | fast_image_resize | Multi-threaded with Rayon |
| WebP Codec | libwebp | Google's optimized encoder |
| HEIC Decoder | libheif-rs | Native Apple format support |
| Placeholders | thumbhash + blurhash | Compact image previews |
| Node Bindings | napi-rs | Zero-copy buffer handling |

<br />

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

<br />

## License

[MIT](LICENSE) © [Aissam Irhir](https://github.com/nexus-aissam)

<br />

<div align="center">

**[Documentation](https://nexus-aissam.github.io/bun-image-turbo/)** · **[npm](https://www.npmjs.com/package/bun-image-turbo)** · **[GitHub](https://github.com/nexus-aissam/bun-image-turbo)** · **[Issues](https://github.com/nexus-aissam/bun-image-turbo/issues)**

</div>
