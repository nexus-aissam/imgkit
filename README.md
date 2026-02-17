<div align="center">

# imgkit

**High-performance image processing for Bun and Node.js**

*Built with Rust and napi-rs for maximum speed*

[![npm version](https://img.shields.io/npm/v/imgkit?style=flat-square&color=f97316)](https://www.npmjs.com/package/imgkit)
[![downloads](https://img.shields.io/npm/dm/imgkit?style=flat-square&color=10b981)](https://www.npmjs.com/package/imgkit)
[![CI](https://img.shields.io/github/actions/workflow/status/nexus-aissam/imgkit/ci.yml?style=flat-square&label=CI)](https://github.com/nexus-aissam/imgkit/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[Documentation](https://nexus-aissam.github.io/imgkit/) · [API Reference](https://nexus-aissam.github.io/imgkit/api/) · [Examples](https://nexus-aissam.github.io/imgkit/examples/) · [Changelog](https://nexus-aissam.github.io/imgkit/changelog)

</div>

## Highlights

<table>
<tr>
<td width="50%">

### Performance

- **950x faster** metadata extraction
- **1.9x faster** thumbnail generation
- **2.6x faster** concurrent operations
- **SIMD-accelerated** JPEG codec
- **Zero-copy** cropping & buffer handling

</td>
<td width="50%">

### Features

- **Fast Thumbnails** (shrink-on-load)
- **Native HEIC/HEIF** support
- **Smart Crop** (content-aware)
- **Dominant Colors** (UI theming)
- **ThumbHash & BlurHash** placeholders
- **Perceptual Hashing** (pHash/dHash)
- **ML Tensor Conversion** (SIMD)
- **EXIF metadata** read/write
- **Timeout & AbortSignal** support

</td>
</tr>
</table>

## Installation

```bash
bun add imgkit       # Bun
npm install imgkit   # npm
yarn add imgkit      # Yarn
pnpm add imgkit      # pnpm
```

## Quick Start

```typescript
import { resize, metadata, smartCrop, transform, thumbhash, toTensor } from 'imgkit';

const buf = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());

const info = await metadata(buf);                                    // Ultra-fast metadata
const resized = await resize(buf, { width: 200 });                   // Resize
const thumb = await smartCrop(buf, { aspectRatio: '1:1' });          // Content-aware crop
const { dataUrl } = await thumbhash(buf);                            // Placeholder image
const webp = await transform(buf, {                                  // Full pipeline
  crop: { aspectRatio: '16:9' }, resize: { width: 1280 },
  output: { format: 'webp', webp: { quality: 85 } }
});
const tensor = await toTensor(buf, {                                 // ML-ready tensor
  width: 224, height: 224, normalization: 'Imagenet', layout: 'Chw'
});

// Timeout & cancellation (all async functions)
const safe = await resize(buf, { width: 800 }, { timeoutMs: 5000 });
const ac = new AbortController();
await resize(buf, { width: 800 }, { signal: ac.signal });
```

## API

| Function | Description | Async | Sync |
|----------|-------------|:-----:|:----:|
| `metadata()` | Image dimensions, format, color info | ✅ | ✅ |
| `resize()` | Resize with multiple algorithms | ✅ | ✅ |
| `crop()` | Crop region (zero-copy) | ✅ | ✅ |
| `smartCrop()` | Content-aware crop | ✅ | ✅ |
| `dominantColors()` | Extract colors for UI theming | ✅ | ✅ |
| `thumbnail()` | Fast thumbnail (shrink-on-load) | ✅ | ✅ |
| `transform()` | Multi-operation pipeline | ✅ | ✅ |
| `toJpeg()` / `toPng()` / `toWebp()` | Format conversion | ✅ | ✅ |
| `blurhash()` / `thumbhash()` | Image placeholders | ✅ | ✅ |
| `toTensor()` | ML tensor (SIMD-accelerated) | ✅ | ✅ |
| `imageHash()` / `imageHashDistance()` | Perceptual hashing | ✅ | ✅ |
| `writeExif()` / `stripExif()` | EXIF metadata | ✅ | ✅ |

All async functions support `{ timeoutMs?, signal? }` for timeout & cancellation. All have sync variants (`resizeSync()`, etc.).

<p align="center">
  <a href="https://nexus-aissam.github.io/imgkit/api/"><img src="https://img.shields.io/badge/Full_API_Reference-f97316?style=for-the-badge&logo=book&logoColor=white" alt="Full API Reference" /></a>
  <a href="https://nexus-aissam.github.io/imgkit/examples/"><img src="https://img.shields.io/badge/Examples-10b981?style=for-the-badge&logo=code&logoColor=white" alt="Examples" /></a>
  <a href="https://nexus-aissam.github.io/imgkit/api/timeout"><img src="https://img.shields.io/badge/Timeout_&_Cancellation-6366f1?style=for-the-badge&logo=clock&logoColor=white" alt="Timeout & Cancellation" /></a>
</p>

## Formats & Platforms

**Formats:** JPEG (TurboJPEG/SIMD), PNG, WebP, GIF, BMP, TIFF (read), HEIC/AVIF (macOS ARM64)

**Platforms:** macOS (ARM64, x64) · Linux (x64 glibc/musl, ARM64) · Windows (x64, ARM64)

## Development

```bash
git clone https://github.com/nexus-aissam/imgkit.git && cd imgkit
bun install && bun run build && bun run build:ts && bun test
```

## License

[MIT](LICENSE) © [Aissam Irhir](https://github.com/nexus-aissam)

<p align="center">
  <a href="https://nexus-aissam.github.io/imgkit/"><img src="https://img.shields.io/badge/Documentation-f97316?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Documentation" /></a>
  <a href="https://www.npmjs.com/package/imgkit"><img src="https://img.shields.io/badge/npm-cb3837?style=for-the-badge&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://github.com/nexus-aissam/imgkit"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
  <a href="https://github.com/nexus-aissam/imgkit/issues"><img src="https://img.shields.io/badge/Issues-6366f1?style=for-the-badge&logo=github&logoColor=white" alt="Issues" /></a>
</p>
