# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.5] - 2026-01-09

### Fixed

- **ESM/CJS Native Binding Loading** - Fixed native module loading in Node.js ESM context
  - Use `createRequire(import.meta.url)` for ESM modules
  - Proper fallback to native `require` for CJS context
  - Fixes "Cannot find package" errors when using `import` in Node.js

### Changed

- Updated optional dependencies to ^1.4.5

---

## [1.4.0] - 2026-01-08

### Added

- **WebP Shrink-on-Load Optimization** - Decode WebP images directly to target resolution
  - Uses libwebp's native `use_scaling` for 1.15-1.25x faster WebP resize operations
  - Memory usage scales with OUTPUT size, not INPUT size (up to 25x reduction)
  - Multi-threaded WebP decoding via `use_threads` option

### Performance

- **WebP Resize Benchmarks** (vs sharp):
  - 800x600 → 200px: 3.1ms vs 4.3ms (**1.40x faster**)
  - 1600x1200 → 200px: 6.4ms vs 8.0ms (**1.24x faster**)
  - 2000x1500 → 200px: 8.6ms vs 10.1ms (**1.18x faster**)
  - 3000x2000 → 200px: 14.7ms vs 16.1ms (**1.10x faster**)
  - 4000x3000 → 400px: 32.4ms vs 33.1ms (**1.02x faster**)
  - **Faster than sharp across ALL image sizes!**

### Optimizations

- **Zero-Copy Pipeline** - Reduced memory copies from 3-5 to 1-2 per operation
  - `resize_image()` now takes ownership to avoid cloning
  - `resize_multi_step()` takes ownership, eliminating initial clone
  - Encoders use `as_rgb8()`/`as_rgba8()` to avoid conversion when possible
- **Skip Double-Resize** - Early return when shrink-on-load already achieved target dimensions

### Fixed

- **Issue #3: WebP resize slower than sharp** - Now 1.15-1.25x faster
- **Issue #3: macOS requires libheif for WebP** - CI only installs libheif for ARM64 builds
- **Issue #3: Linux installation fails** - Added optionalDependencies for platform packages

### Technical Details

- Added `libwebp-sys2` crate for low-level WebP decoder control
- New `rust/src/decode/webp.rs` module with shrink-on-load implementation
- Updated resize module to take ownership instead of references

---

## [1.3.1] - 2026-01-08

### Changed

- **Code Reorganization** - Refactored codebase for better maintainability
  - Split `rust/src/decode.rs` (1,019 lines) into modular `decode/` and `metadata/` directories
  - Extracted Rust types to `rust/src/types.rs`
  - Split `src/index.ts` (542 lines) into `loader.ts`, `converters.ts`, and `api/` modules
  - No API changes - all functionality preserved
- Removed unused code and fixed Rust compiler warnings

---

## [1.3.0] - 2026-01-07

### Added

- **EXIF Metadata Writing** - Write EXIF metadata to JPEG and WebP images
  - `writeExif()` / `writeExifSync()` - Add EXIF metadata to images
  - `stripExif()` / `stripExifSync()` - Remove all EXIF metadata from images
  - Perfect for AI-generated image attribution and metadata embedding
  - Supports: ImageDescription, Artist, Copyright, Software, DateTime, UserComment, Make, Model, Orientation
  - Use `transform()` with `exif` option to add metadata during processing

### Technical Details

- Added `img-parts` crate for EXIF chunk manipulation
- EXIF data built using proper TIFF/IFD0 structure
- UserComment field supports JSON storage for AI generation parameters
- Full async and sync API support

---

## [1.2.2] - 2025-12-12

### Documentation

- **Complete API documentation overhaul** - All TypeScript interfaces now match actual Rust implementation
- **Fixed ImageMetadata interface** - Added all 18 fields (space, depth, bitsPerSample, isProgressive, isPalette, hasProfile, orientation, pages, loopCount, delay, background, compression, density)
- **Fixed enum case sensitivity** - All enums are PascalCase (`'Jpeg'`, `'Cover'`, `'Lanczos3'`), not lowercase
- **Added background option to resize()** - Document the `background: [r, g, b, a]` option for padding
- **Enhanced README** - Professional layout with badges, benchmark tables, and documentation links

### Changed

- **Homepage** - Now points to GitHub Pages documentation site

---

## [1.2.1] - 2025-12-12

### Documentation

- **New Architecture Guide** - Deep dive into tech stack, processing pipeline, and key optimizations
- **Fixed resize() documentation** - Clarified that output is always PNG format
- **Fixed transform() documentation** - `output` is optional (defaults to PNG), added GIF/BMP examples
- **Fixed formats guide** - Removed non-existent `toGif()`, use `transform()` instead
- **Enhanced performance guide** - Added technical details about shrink-on-decode, multi-step resize, and adaptive algorithm selection
- **Updated API reference** - Added `version()` function documentation
- **Fixed platform support tables** - All platforms are supported, HEIC only on macOS ARM64
- **Added VitePress documentation site** - Professional docs with GitHub Pages deployment

### Fixed

- ESM module configuration for VitePress 1.6+

---

## [1.2.0] - 2025-12-11

### Added

- **HEIC/HEIF Support** - Native support for reading HEIC and HEIF image files
  - Decode iPhone photos and other HEIC/HEIF images
  - Convert HEIC to JPEG, PNG, or WebP
  - Full metadata extraction for HEIC files
  - Support for HEIC images with alpha channel
  - **Shrink-on-decode optimization** for faster resize operations

- **AVIF Support** - Read AVIF images via libheif
  - AVIF format detection and decoding
  - Metadata extraction for AVIF files

### Performance

- **HEIC → JPEG**: 169ms for 12MP iPhone photo
- **HEIC → 800px JPEG**: 138ms (25% faster with shrink-on-decode)
- **HEIC → 200px thumbnail**: 137ms
- **HEIC Metadata**: 0.1ms (instant)

### Technical Details

- Added `libheif-rs` v2.5 dependency (uses system libheif)
- Optimized pixel extraction with fast-path for contiguous memory
- HEIC shrink-on-decode via libheif's native scale() function
- HEIC detection via ftyp box examination (supports heic, heix, hevc, hevx, mif1, msf1, avif brands)
- Memory protection for large HEIC images (100 megapixel limit)
- RGB and RGBA output support based on source alpha channel

## [1.0.5] - 2025-12-10

### Fixed

- Add optional dependency package resolution for native bindings

## [1.0.4] - 2025-12-09

### Changed

- Bump version to 1.0.4

## [1.0.3] - 2025-12-08

### Added

- Examples folder with demos
- Sync Cargo.toml version

### Changed

- Documentation improvements with badges

## [1.0.0] - 2025-12-01

### Added

- Initial release
- High-performance image processing with Rust and napi-rs
- JPEG encoding/decoding with TurboJPEG (libjpeg-turbo SIMD)
- PNG encoding/decoding with adaptive compression
- WebP encoding/decoding (lossy and lossless)
- GIF, BMP, ICO, TIFF read support
- Image resizing with multiple algorithms (Nearest, Bilinear, CatmullRom, Mitchell, Lanczos3)
- Transform pipeline (resize, rotate, flip, grayscale, blur, sharpen, brightness, contrast)
- Blurhash generation
- Both async and sync APIs
- Full TypeScript support
- Cross-platform support (macOS, Linux, Windows)
