# Types

TypeScript type definitions for bun-image-turbo.

## ImageMetadata

Returned by `metadata()` and `metadataSync()`.

```typescript
interface ImageMetadata {
  width: number;      // Image width in pixels
  height: number;     // Image height in pixels
  format: string;     // Image format (jpeg, png, webp, heic, etc.)
  channels: number;   // Number of channels (3 = RGB, 4 = RGBA)
  hasAlpha: boolean;  // Whether image has alpha channel
}
```

## ResizeOptions

Options for `resize()` and `resizeSync()`.

```typescript
interface ResizeOptions {
  width?: number;   // Target width (optional if height provided)
  height?: number;  // Target height (optional if width provided)
  fit?: FitMode;    // How to fit image into dimensions
  filter?: Filter;  // Resampling algorithm
}
```

## FitMode

How the image fits into target dimensions.

```typescript
type FitMode = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
```

| Mode | Description |
|------|-------------|
| `cover` | Fill target area, may crop (default) |
| `contain` | Fit within target, no cropping |
| `fill` | Exact dimensions, may distort |
| `inside` | Shrink if larger than target |
| `outside` | Enlarge if smaller than target |

## Filter

Resampling algorithm for resizing.

```typescript
type Filter = 'nearest' | 'bilinear' | 'catmullRom' | 'mitchell' | 'lanczos3';
```

| Filter | Quality | Speed |
|--------|---------|-------|
| `nearest` | Lowest | Fastest |
| `bilinear` | Good | Fast |
| `catmullRom` | Better | Medium |
| `mitchell` | Better | Medium |
| `lanczos3` | Best | Slower (default) |

## JpegOptions

Options for `toJpeg()` and `toJpegSync()`.

```typescript
interface JpegOptions {
  quality?: number;  // 1-100, default: 80
}
```

## PngOptions

Options for `toPng()` and `toPngSync()`.

```typescript
interface PngOptions {
  compression?: number;  // 0-9, default: 6
}
```

## WebpOptions

Options for `toWebp()` and `toWebpSync()`.

```typescript
interface WebpOptions {
  quality?: number;    // 1-100, default: 80
  lossless?: boolean;  // Use lossless compression, default: false
}
```

## TransformOptions

Options for `transform()` and `transformSync()`.

```typescript
interface TransformOptions {
  // Resize options
  resize?: {
    width?: number;
    height?: number;
    fit?: FitMode;
    filter?: Filter;
  };

  // Rotation (90, 180, or 270 degrees)
  rotate?: 90 | 180 | 270;

  // Flipping
  flipH?: boolean;  // Horizontal flip
  flipV?: boolean;  // Vertical flip

  // Color adjustments
  grayscale?: boolean;
  brightness?: number;  // -100 to 100
  contrast?: number;    // -100 to 100

  // Effects
  blur?: number;    // 0 to 100
  sharpen?: number; // 0 to 100

  // Output format (required)
  output: OutputOptions;
}
```

## OutputOptions

Output format configuration for `transform()`.

```typescript
interface OutputOptions {
  format: 'jpeg' | 'png' | 'webp';
  jpeg?: JpegOptions;
  png?: PngOptions;
  webp?: WebpOptions;
}
```

## BlurhashResult

Returned by `blurhash()` and `blurhashSync()`.

```typescript
interface BlurhashResult {
  hash: string;    // Blurhash string
  width: number;   // Original image width
  height: number;  // Original image height
}
```

## Complete Type Definitions

```typescript
// Import types (if using TypeScript)
import type {
  ImageMetadata,
  ResizeOptions,
  FitMode,
  Filter,
  JpegOptions,
  PngOptions,
  WebpOptions,
  TransformOptions,
  OutputOptions,
  BlurhashResult
} from 'bun-image-turbo';

// Function signatures
declare function metadata(input: Buffer): Promise<ImageMetadata>;
declare function metadataSync(input: Buffer): ImageMetadata;

declare function resize(input: Buffer, options: ResizeOptions): Promise<Buffer>;
declare function resizeSync(input: Buffer, options: ResizeOptions): Buffer;

declare function toJpeg(input: Buffer, options?: JpegOptions): Promise<Buffer>;
declare function toJpegSync(input: Buffer, options?: JpegOptions): Buffer;

declare function toPng(input: Buffer, options?: PngOptions): Promise<Buffer>;
declare function toPngSync(input: Buffer, options?: PngOptions): Buffer;

declare function toWebp(input: Buffer, options?: WebpOptions): Promise<Buffer>;
declare function toWebpSync(input: Buffer, options?: WebpOptions): Buffer;

declare function transform(input: Buffer, options: TransformOptions): Promise<Buffer>;
declare function transformSync(input: Buffer, options: TransformOptions): Buffer;

declare function blurhash(
  input: Buffer,
  componentsX?: number,
  componentsY?: number
): Promise<BlurhashResult>;
declare function blurhashSync(
  input: Buffer,
  componentsX?: number,
  componentsY?: number
): BlurhashResult;

declare function version(): string;
```

## Usage Example

```typescript
import {
  transform,
  type TransformOptions,
  type ImageMetadata
} from 'bun-image-turbo';

const options: TransformOptions = {
  resize: { width: 800, fit: 'cover' },
  grayscale: true,
  output: { format: 'webp', webp: { quality: 80 } }
};

const result: Buffer = await transform(buffer, options);
```
