# Composite & Watermark

Overlay logos, badges, and watermarks onto images with `composite()`.

## Bottom-right watermark

The most common case — a semi-transparent logo anchored to a corner.

```typescript
import { composite, resize } from 'imgkit';

const photo = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const logoRaw = Buffer.from(await Bun.file('logo.png').arrayBuffer());

// Scale the logo first, then composite
const logo = await resize(logoRaw, { width: 180 });

const watermarked = await composite(photo, {
  layers: [
    { input: logo, gravity: 'southEast', opacity: 0.7, offsetX: -32, offsetY: -32 },
  ],
  output: { format: 'jpeg', jpeg: { quality: 90 } },
});

await Bun.write('watermarked.jpg', watermarked);
```

## Tiled / repeating watermark

Set `tile: true` to stamp a layer across the whole image — great for "SAMPLE" or "DRAFT" overlays.

```typescript
const tiled = await composite(photo, {
  layers: [{ input: stamp, tile: true, opacity: 0.15 }],
});
```

## Blend modes

```typescript
// Multiply a gradient/texture over a photo
const blended = await composite(photo, {
  layers: [{ input: gradient, blend: 'multiply', opacity: 0.6 }],
});
```

Available modes: `over` (default), `multiply`, `screen`, `overlay`, `darken`, `lighten`, `add`.

## Multiple stacked layers

Layers are painted in array order (first = bottom-most).

```typescript
const out = await composite(background, {
  layers: [
    { input: product, gravity: 'center' },
    { input: badge,   gravity: 'northEast', resize: { width: 80 } },
    { input: logo,    gravity: 'southWest', opacity: 0.8 },
  ],
  output: { format: 'webp', webp: { quality: 90 } },
});
```

## Absolute positioning

Use `left`/`top` for pixel-precise placement (overrides `gravity`). Off-canvas and negative positions are clipped automatically.

```typescript
const out = await composite(photo, {
  layers: [{ input: logo, left: 24, top: 24 }],
});
```

## Full runnable example

See [`examples/composite.ts`](https://github.com/nexus-aissam/imgkit/blob/main/examples/composite.ts) in the repo:

```bash
bun run examples/composite.ts
# → output/composite-watermark.jpg, composite-tiled.jpg, composite-multiply.jpg, composite-stacked.png
```

See the full [Composite API reference](/api/composite) for every option.
