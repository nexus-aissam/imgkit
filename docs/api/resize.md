# resize

Resize an image with optional fit mode and filter algorithm.

## Signature

```typescript
function resize(input: Buffer, options: ResizeOptions): Promise<Buffer>
function resizeSync(input: Buffer, options: ResizeOptions): Buffer
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `Buffer` | Image buffer |
| `options` | `ResizeOptions` | Resize configuration |

### ResizeOptions

```typescript
interface ResizeOptions {
  width?: number;   // Target width (optional if height provided)
  height?: number;  // Target height (optional if width provided)
  fit?: FitMode;    // How to fit image into dimensions
  filter?: Filter;  // Resampling algorithm
}

type FitMode = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
type Filter = 'nearest' | 'bilinear' | 'catmullRom' | 'mitchell' | 'lanczos3';
```

## Returns

`Buffer` - Resized image as **PNG format**

::: tip Output Format
The `resize()` function always outputs PNG format regardless of input format. This ensures lossless quality preservation during resize operations. If you need a different output format, use `transform()` instead:

```typescript
// Resize and output as JPEG
const result = await transform(buffer, {
  resize: { width: 800 },
  output: { format: 'jpeg', jpeg: { quality: 85 } }
});
```
:::

## Examples

### Basic Resize

```typescript
import { resize } from 'bun-image-turbo';

// Resize by width (maintains aspect ratio)
const resized = await resize(buffer, { width: 800 });

// Resize by height
const resized = await resize(buffer, { height: 600 });

// Resize to specific dimensions
const resized = await resize(buffer, { width: 800, height: 600 });
```

### Fit Modes

```typescript
// Cover: Fill target area, may crop
const cover = await resize(buffer, {
  width: 400,
  height: 400,
  fit: 'cover'
});

// Contain: Fit within target, no cropping
const contain = await resize(buffer, {
  width: 400,
  height: 400,
  fit: 'contain'
});

// Fill: Exact dimensions, may distort
const fill = await resize(buffer, {
  width: 400,
  height: 400,
  fit: 'fill'
});

// Inside: Only shrink if larger
const inside = await resize(buffer, {
  width: 400,
  height: 400,
  fit: 'inside'
});

// Outside: Only enlarge if smaller
const outside = await resize(buffer, {
  width: 400,
  height: 400,
  fit: 'outside'
});
```

### Filter Algorithms

```typescript
// Fastest (pixel art, icons)
const nearest = await resize(buffer, {
  width: 400,
  filter: 'nearest'
});

// Fast with good quality
const bilinear = await resize(buffer, {
  width: 400,
  filter: 'bilinear'
});

// Balanced
const catmull = await resize(buffer, {
  width: 400,
  filter: 'catmullRom'
});

// Good for downscaling
const mitchell = await resize(buffer, {
  width: 400,
  filter: 'mitchell'
});

// Highest quality (default)
const lanczos = await resize(buffer, {
  width: 400,
  filter: 'lanczos3'
});
```

### Sync Version

```typescript
import { resizeSync } from 'bun-image-turbo';

const resized = resizeSync(buffer, { width: 400 });
```

### Thumbnail Generation

```typescript
// Square thumbnail with cover crop
const thumb = await resize(buffer, {
  width: 150,
  height: 150,
  fit: 'cover',
  filter: 'lanczos3'
});
```

## Fit Mode Reference

| Mode | Behavior | Aspect Ratio | Cropping |
|------|----------|:------------:|:--------:|
| `cover` | Fill target area | Preserved | Yes |
| `contain` | Fit within target | Preserved | No |
| `fill` | Exact dimensions | Distorted | No |
| `inside` | Shrink if larger | Preserved | No |
| `outside` | Enlarge if smaller | Preserved | No |

## Filter Reference

| Filter | Quality | Speed | Use Case |
|--------|---------|-------|----------|
| `nearest` | Low | Fastest | Pixel art |
| `bilinear` | Good | Fast | Previews |
| `catmullRom` | Better | Medium | General |
| `mitchell` | Better | Medium | Downscaling |
| `lanczos3` | Best | Slower | High quality |

## Defaults

- `fit`: `'cover'`
- `filter`: `'lanczos3'`

## Notes

- At least one of `width` or `height` is required
- When only one dimension is provided, aspect ratio is preserved
- **Output is always PNG format** - use `transform()` for other formats
- Uses **shrink-on-decode** optimization for JPEG/HEIC inputs (decodes at reduced resolution for faster thumbnails)
- Uses **adaptive algorithm selection** when no filter is specified:
  - `>4x downscale`: Box filter (fastest)
  - `2-4x downscale`: Bilinear
  - `1.33-2x downscale`: CatmullRom
  - `<1.33x`: Lanczos3 (best quality)
- Uses **multi-step resize** for large scale reductions (>75% smaller) - progressively halves the image for better performance
