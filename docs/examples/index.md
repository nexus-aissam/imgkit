# Examples

Practical examples showing how to use bun-image-turbo in real applications.

## Runnable Examples

The repository includes complete, runnable examples in the [`examples/`](https://github.com/nexus-aissam/bun-image-turbo/tree/main/examples) folder:

```bash
# Clone and run examples
git clone https://github.com/nexus-aissam/bun-image-turbo
cd bun-image-turbo/examples

# Install dependencies
bun install

# Run examples
bun run basic    # Basic usage demo
bun run heic     # HEIC conversion
bun run api      # HTTP API server
bun run batch    # Batch processing
```

## Example Files

| File | Description |
|------|-------------|
| [basic-usage.ts](/examples/basic-usage) | Core functionality demo |
| [heic-conversion.ts](/examples/heic-conversion) | HEIC/HEIF conversion |
| [api-endpoint.ts](/examples/api-endpoint) | HTTP image processing server |
| [batch-processing.ts](/examples/batch-processing) | Parallel batch processing |
| [exif-metadata.ts](/examples/exif-metadata) | EXIF metadata writing for AI images |
| [thumbhash.ts](/examples/thumbhash) | ThumbHash placeholder generation |

## Quick Examples

### Get Image Info

```typescript
import { metadata } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const info = await metadata(buffer);
console.log(`${info.width}x${info.height} ${info.format}`);
```

### Resize Image

```typescript
import { resize } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const resized = await resize(buffer, { width: 800 });
// Note: resize() outputs PNG format
await Bun.write('resized.png', resized);
```

### Convert to WebP

```typescript
import { toWebp } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const webp = await toWebp(buffer, { quality: 80 });
await Bun.write('photo.webp', webp);
```

### Apply Transformations

```typescript
import { transform } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const result = await transform(buffer, {
  resize: { width: 800, height: 600, fit: 'cover' },
  rotate: 90,
  grayscale: true,
  sharpen: 10,
  output: { format: 'webp', webp: { quality: 85 } }
});
await Bun.write('output.webp', result);
```

### Generate BlurHash

```typescript
import { blurhash } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const { hash, width, height } = await blurhash(buffer, 4, 3);
console.log(`Hash: ${hash}`);
console.log(`Original: ${width}x${height}`);
```

### Generate ThumbHash (Recommended)

```typescript
import { thumbhash } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const { dataUrl, hash, hasAlpha } = await thumbhash(buffer);

// Use directly in HTML - no decoding needed!
const html = `<img src="${dataUrl}" alt="placeholder" />`;

// Or store compact hash (~25 bytes) in database
console.log(`Hash size: ${hash.length} bytes`);
```

### Add EXIF Metadata

```typescript
import { writeExif, toWebp } from 'bun-image-turbo';

const buffer = Buffer.from(await Bun.file('ai-generated.png').arrayBuffer());
const webp = await toWebp(buffer, { quality: 90 });

const withExif = await writeExif(webp, {
  imageDescription: 'A beautiful sunset over mountains',
  artist: 'Stable Diffusion XL',
  software: 'ComfyUI',
  userComment: JSON.stringify({
    prompt: 'sunset over mountains, 8k, detailed',
    seed: 12345,
    steps: 30
  })
});
await Bun.write('with-metadata.webp', withExif);
```

### Convert HEIC (macOS ARM64)

```typescript
import { toJpeg } from 'bun-image-turbo';

const heic = Buffer.from(await Bun.file('IMG_1234.HEIC').arrayBuffer());
const jpeg = await toJpeg(heic, { quality: 90 });
await Bun.write('photo.jpg', jpeg);
```

## Use Cases

- **Web Server**: Process images on-the-fly for user uploads
- **Static Site Generator**: Optimize images during build
- **CLI Tool**: Batch convert/resize images
- **API Service**: Image processing microservice
- **Desktop App**: Process local images with Tauri/Electron

## Next Steps

- [Basic Usage Example](/examples/basic-usage)
- [HEIC Conversion Example](/examples/heic-conversion)
- [EXIF Metadata Example](/examples/exif-metadata)
- [ThumbHash Placeholders](/examples/thumbhash)
- [API Endpoint Example](/examples/api-endpoint)
- [Batch Processing Example](/examples/batch-processing)
