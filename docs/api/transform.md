# transform

Apply multiple image transformations in a single operation.

## Signature

```typescript
function transform(input: Buffer, options: TransformOptions): Promise<Buffer>
function transformSync(input: Buffer, options: TransformOptions): Buffer
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `Buffer` | Image buffer |
| `options` | `TransformOptions` | Transform configuration |

### TransformOptions

```typescript
interface TransformOptions {
  // Resize
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    filter?: 'nearest' | 'bilinear' | 'catmullRom' | 'mitchell' | 'lanczos3';
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

  // Output format (optional - defaults to PNG)
  output?: {
    format: 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp';
    jpeg?: { quality?: number };
    png?: { compression?: number };
    webp?: { quality?: number; lossless?: boolean };
  };
}
```

## Returns

`Buffer` - Transformed image in specified output format (defaults to PNG if no output format specified)

## Examples

### Basic Transform

```typescript
import { transform } from 'bun-image-turbo';

const result = await transform(buffer, {
  resize: { width: 800 },
  output: { format: 'webp', webp: { quality: 80 } }
});
```

### Resize and Convert

```typescript
const result = await transform(buffer, {
  resize: {
    width: 800,
    height: 600,
    fit: 'cover'
  },
  output: {
    format: 'jpeg',
    jpeg: { quality: 85 }
  }
});
```

### Rotation

```typescript
// Rotate 90° clockwise
const rotated = await transform(buffer, {
  rotate: 90,
  output: { format: 'jpeg' }
});
```

### Flipping

```typescript
// Horizontal mirror
const mirrored = await transform(buffer, {
  flipH: true,
  output: { format: 'jpeg' }
});

// Vertical flip
const flipped = await transform(buffer, {
  flipV: true,
  output: { format: 'jpeg' }
});
```

### Grayscale

```typescript
const bw = await transform(buffer, {
  grayscale: true,
  output: { format: 'jpeg' }
});
```

### Blur

```typescript
const blurred = await transform(buffer, {
  blur: 10,  // 0-100
  output: { format: 'jpeg' }
});
```

### Sharpen

```typescript
const sharp = await transform(buffer, {
  sharpen: 15,  // 0-100
  output: { format: 'jpeg' }
});
```

### Brightness and Contrast

```typescript
const adjusted = await transform(buffer, {
  brightness: 10,   // -100 to 100
  contrast: 5,      // -100 to 100
  output: { format: 'jpeg' }
});
```

### Complete Pipeline

```typescript
const result = await transform(buffer, {
  // Resize to cover 800x600
  resize: {
    width: 800,
    height: 600,
    fit: 'cover',
    filter: 'lanczos3'
  },

  // Rotate 90°
  rotate: 90,

  // Apply effects
  grayscale: true,
  sharpen: 10,
  brightness: 5,
  contrast: 10,

  // Output as WebP
  output: {
    format: 'webp',
    webp: { quality: 85 }
  }
});
```

### Sync Version

```typescript
import { transformSync } from 'bun-image-turbo';

const result = transformSync(buffer, {
  resize: { width: 400 },
  output: { format: 'jpeg' }
});
```

### Thumbnail Generation

```typescript
const thumb = await transform(buffer, {
  resize: {
    width: 150,
    height: 150,
    fit: 'cover'
  },
  sharpen: 5,  // Slight sharpen after resize
  output: {
    format: 'webp',
    webp: { quality: 70 }
  }
});
```

## Transformation Order

Transformations are applied in this order:

1. Resize
2. Rotate
3. Flip (H/V)
4. Grayscale
5. Blur
6. Sharpen
7. Brightness
8. Contrast
9. Encode to output format

## Output Format Options

### JPEG

```typescript
output: {
  format: 'jpeg',
  jpeg: { quality: 85 }  // 1-100
}
```

### PNG

```typescript
output: {
  format: 'png',
  png: { compression: 6 }  // 0-9
}
```

### WebP

```typescript
output: {
  format: 'webp',
  webp: {
    quality: 80,      // 1-100
    lossless: false   // true for lossless
  }
}
```

### GIF

```typescript
output: {
  format: 'gif'
  // No additional options
}
```

### BMP

```typescript
output: {
  format: 'bmp'
  // No additional options
}
```

::: info Default Output
If `output` is not specified, the image will be encoded as PNG.
:::

## Performance Tips

1. **Use transform() for multiple operations** - Single decode/encode is faster than chaining functions
2. **Resize first** - Reduces pixels for subsequent operations
3. **Choose appropriate filter** - `bilinear` is fast, `lanczos3` is high quality

## See Also

- [`resize()`](/api/resize) - Resize only
- [`toJpeg()`](/api/to-jpeg) - Convert to JPEG only
- [`toWebp()`](/api/to-webp) - Convert to WebP only
