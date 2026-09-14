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
- **Composite / Watermark** (blend modes)
- **Dominant Colors** (UI theming)
- **ThumbHash & BlurHash** placeholders
- **Perceptual Hashing** (pHash/dHash)
- **ML Tensor Conversion** (SIMD)
- **EXIF metadata** read/write
- **Timeout & AbortSignal** support
- **WebAssembly** fallback build

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
import { resize, metadata, smartCrop, composite, transform, thumbhash, toTensor } from 'imgkit';

const buf = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const logo = Buffer.from(await Bun.file('logo.png').arrayBuffer());

const info = await metadata(buf);                                    // Ultra-fast metadata
const resized = await resize(buf, { width: 200 });                   // Resize
const thumb = await smartCrop(buf, { aspectRatio: '1:1' });          // Content-aware crop
const marked = await composite(buf, {                                // Watermark / overlay
  layers: [{ input: logo, gravity: 'southEast', opacity: 0.7 }]
});
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
| `composite()` | Overlay / watermark with blend modes | ✅ | ✅ |
| `dominantColors()` | Extract colors for UI theming | ✅ | ✅ |
| `thumbnail()` | Fast thumbnail (shrink-on-load) | ✅ | ✅ |
| `transform()` | Multi-operation pipeline | ✅ | ✅ |
| `toJpeg()` / `toPng()` / `toWebp()` | Format conversion | ✅ | ✅ |
| `blurhash()` / `thumbhash()` | Image placeholders | ✅ | ✅ |
| `toTensor()` | ML tensor (SIMD-accelerated) | ✅ | ✅ |
| `imageHash()` / `imageHashDistance()` | Perceptual hashing | ✅ | ✅ |
| `writeExif()` / `stripExif()` | EXIF metadata | ✅ | ✅ |
| `codecBackend()` | Which backend is loaded & its capabilities | — | ✅ |

All async functions support `{ timeoutMs?, signal? }` for timeout & cancellation. All have sync variants (`resizeSync()`, etc.).

<p align="center">
  <a href="https://nexus-aissam.github.io/imgkit/api/"><img src="https://img.shields.io/badge/Full_API_Reference-f97316?style=for-the-badge&logo=book&logoColor=white" alt="Full API Reference" /></a>
  <a href="https://nexus-aissam.github.io/imgkit/examples/"><img src="https://img.shields.io/badge/Examples-10b981?style=for-the-badge&logo=code&logoColor=white" alt="Examples" /></a>
  <a href="https://nexus-aissam.github.io/imgkit/api/timeout"><img src="https://img.shields.io/badge/Timeout_&_Cancellation-6366f1?style=for-the-badge&logo=clock&logoColor=white" alt="Timeout & Cancellation" /></a>
</p>

## WebAssembly

imgkit now runs on platforms with no prebuilt binary. Under Node the loader tries
every native strategy first and falls back to WebAssembly only if none succeeds,
so you keep the fast path automatically and an unsupported platform degrades
instead of throwing at import.

The wasm build is compiled from the same Rust source as the native addon, so
there is no second implementation to drift out of sync.

> **Browser & edge support is not finished.** The `.wasm` module and both loaders
> ship in the package, but the browser entry point is still to be built, so
> `import 'imgkit'` does not yet work in a bundle. See the
> [WebAssembly guide](https://nexus-aissam.github.io/imgkit/guide/wasm) for what
> is and is not available.

Because the wasm build swaps the C codecs (libjpeg-turbo, libwebp) for pure-Rust
ones, a few things differ. Check at runtime rather than guessing:

```typescript
const b = codecBackend();
// { backend: 'pure-rust', wasm: true,
//   shrinkOnLoad: false, webpLossyEncode: false, heic: false }
```

| | Native | WebAssembly |
|---|---|:---:|
| Shrink-on-load (fast thumbnails) | ✅ | ❌ |
| Lossy WebP encode (`quality`) | ✅ | ❌ lossless only |
| HEIC/HEIF decode | ✅ | ❌ |
| Async runs off-thread | ✅ | ❌ |
| Everything else | ✅ | ✅ |

JPEG quality *is* honoured on both. Full details, including the `timeoutMs`
caveat and why the wasm build needs Node rather than Bun, are in the
[WebAssembly guide](https://nexus-aissam.github.io/imgkit/guide/wasm).

```bash
rustup target add wasm32-wasip1-threads
bun run build:wasm        # outputs to wasm/
bun run test:wasm
```

## Formats & Platforms

**Formats:** JPEG (TurboJPEG/SIMD), PNG, WebP, GIF, BMP, TIFF (read), HEIC/AVIF (macOS ARM64)

**Platforms:** macOS (ARM64, x64) · Linux (x64 glibc/musl, ARM64) · Windows (x64, ARM64) · **WebAssembly** fallback (Node, any other platform)

## Development

```bash
git clone https://github.com/nexus-aissam/imgkit.git && cd imgkit
bun install && bun run build && bun run build:ts && bun test
```

Building the native addon needs `nasm`, `cmake` and `pkg-config` (for
libjpeg-turbo). The WebAssembly build needs none of them:

```bash
rustup target add wasm32-wasip1-threads
bun run build:wasm && bun run build:ts && bun run test:wasm
```

Rust unit tests run under both codec backends:

```bash
bun run test:rust         # native codecs (libjpeg-turbo + libwebp)
bun run test:rust:pure    # pure-Rust codecs (what WebAssembly uses)
```

## License

[MIT](LICENSE) © [Aissam Irhir](https://github.com/nexus-aissam)

<p align="center">
  <a href="https://nexus-aissam.github.io/imgkit/"><img src="https://img.shields.io/badge/Documentation-f97316?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Documentation" /></a>
  <a href="https://www.npmjs.com/package/imgkit"><img src="https://img.shields.io/badge/npm-cb3837?style=for-the-badge&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://github.com/nexus-aissam/imgkit"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
  <a href="https://github.com/nexus-aissam/imgkit/issues"><img src="https://img.shields.io/badge/Issues-6366f1?style=for-the-badge&logo=github&logoColor=white" alt="Issues" /></a>
</p>
