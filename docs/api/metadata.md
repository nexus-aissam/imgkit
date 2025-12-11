# metadata

Get image metadata without fully decoding the image.

## Signature

```typescript
function metadata(input: Buffer): Promise<ImageMetadata>
function metadataSync(input: Buffer): ImageMetadata
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `Buffer` | Image buffer |

## Returns

```typescript
interface ImageMetadata {
  width: number;      // Image width in pixels
  height: number;     // Image height in pixels
  format: string;     // Image format (jpeg, png, webp, heic, etc.)
  channels: number;   // Number of channels (3 = RGB, 4 = RGBA)
  hasAlpha: boolean;  // Whether image has alpha channel
}
```

## Examples

### Basic Usage

```typescript
import { metadata } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const info = await metadata(buffer);

console.log(info);
// {
//   width: 1920,
//   height: 1080,
//   format: 'jpeg',
//   channels: 3,
//   hasAlpha: false
// }
```

### Sync Version

```typescript
import { metadataSync } from 'bun-image-turbo';

const info = metadataSync(buffer);
console.log(`${info.width}x${info.height} ${info.format}`);
```

### Format Detection

```typescript
const info = await metadata(buffer);

switch (info.format) {
  case 'jpeg':
    console.log('JPEG image');
    break;
  case 'png':
    console.log('PNG image');
    break;
  case 'webp':
    console.log('WebP image');
    break;
  case 'heic':
    console.log('HEIC image (iPhone)');
    break;
  case 'gif':
    console.log('GIF image');
    break;
}
```

### Alpha Channel Detection

```typescript
const info = await metadata(buffer);

if (info.hasAlpha) {
  // Use PNG or WebP to preserve transparency
  const output = await toPng(buffer);
} else {
  // JPEG is fine for non-transparent images
  const output = await toJpeg(buffer);
}
```

### Validation

```typescript
async function validateImage(buffer: Buffer) {
  const info = await metadata(buffer);

  if (info.width > 10000 || info.height > 10000) {
    throw new Error('Image too large');
  }

  if (!['jpeg', 'png', 'webp'].includes(info.format)) {
    throw new Error('Unsupported format');
  }

  return info;
}
```

## Performance

Metadata extraction is extremely fast because it only reads headers:

| Format | Time |
|--------|-----:|
| JPEG (10MB) | 0.003ms |
| WebP (10MB) | 0.004ms |
| PNG (10MB) | 0.002ms |
| HEIC | 0.1ms |

This is **950x faster** than sharp for WebP and **38x faster** for JPEG.

## Supported Formats

| Format | Supported |
|--------|:---------:|
| JPEG | ✅ |
| PNG | ✅ |
| WebP | ✅ |
| HEIC/HEIF | ✅ (macOS ARM64) |
| AVIF | ✅ |
| GIF | ✅ |
| BMP | ✅ |
| TIFF | ✅ |
| ICO | ✅ |

## Errors

```typescript
try {
  const info = await metadata(invalidBuffer);
} catch (error) {
  // "Failed to detect image format"
  // "Invalid image data"
  // "Empty buffer"
}
```
