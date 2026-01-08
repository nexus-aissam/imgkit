# Changelog

All notable changes to bun-image-turbo.

## [1.4.0] - 2026-01-08

### Added

- **WebP Shrink-on-Load Optimization** - Decode WebP images directly to target resolution
  - Uses libwebp's native `use_scaling` for 1.15-1.25x faster WebP resize operations
  - Memory usage scales with OUTPUT size, not INPUT size (up to 25x reduction)

### Performance

- **WebP Resize** now **1.15-1.25x faster** than sharp on average
- Zero-copy pipeline reduces memory copies from 3-5 to 1-2 per operation

### Fixed

- Issue #3: WebP resize slower than sharp - Now faster!
- Issue #3: macOS requires libheif for WebP - CI only installs libheif for ARM64
- Issue #3: Linux installation fails - Added optionalDependencies

---

## [1.3.1] - 2026-01-08

### Changed

- **Code Reorganization** - Refactored codebase for better maintainability
  - Split `rust/src/decode.rs` into modular `decode/` and `metadata/` directories
  - Extracted Rust types to `rust/src/types.rs`
  - Split `src/index.ts` into `loader.ts`, `converters.ts`, and `api/` modules
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

## [1.2.0] - 2024

### Added

- **HEIC/HEIF Support** - Native support for Apple's modern image format (macOS ARM64)
- **Blurhash Generation** - Create compact image placeholder strings
- **AVIF Support** - Read AVIF images via libheif

### Changed

- Improved metadata extraction performance (950x faster for WebP)
- Better error messages for unsupported formats

### Platform Support

- macOS ARM64 (M1/M2/M3/M4/M5) - Full support including HEIC
- macOS x64 (Intel) - Full support except HEIC
- Linux x64 (glibc) - Full support except HEIC
- Linux x64 (musl/Alpine) - Full support except HEIC
- Linux ARM64 (glibc) - Full support except HEIC
- Windows x64 - Full support except HEIC
- Windows ARM64 - Full support except HEIC

---

## [1.1.0] - 2024

### Added

- `transform()` function for multi-operation pipelines
- Brightness and contrast adjustments
- Blur and sharpen effects
- Sync versions of all functions

### Improved

- Resize quality with lanczos3 filter
- Memory usage optimization
- Better TypeScript types

---

## [1.0.0] - 2024

### Initial Release

- `metadata()` - Fast image metadata extraction
- `resize()` - High-quality image resizing
- `toJpeg()` - JPEG encoding with TurboJPEG
- `toPng()` - PNG encoding
- `toWebp()` - WebP encoding (lossy and lossless)
- Grayscale conversion
- Rotation (90, 180, 270 degrees)
- Horizontal and vertical flip

### Supported Formats

- JPEG (read/write)
- PNG (read/write)
- WebP (read/write)
- GIF (read/write)
- BMP (read/write)
- TIFF (read)
- ICO (read)

---

## Links

- [GitHub Releases](https://github.com/nexus-aissam/bun-image-turbo/releases)
- [npm Package](https://www.npmjs.com/package/bun-image-turbo)
