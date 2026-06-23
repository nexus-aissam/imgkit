# Composite

Overlay, watermark, and blend images by compositing one or more layers onto a base image.

## Overview

`composite` paints layers onto a base image using alpha compositing and the standard [W3C separable blend modes](https://www.w3.org/TR/compositing-1/#blending). Layers can be:

- positioned by **gravity** (e.g. `"southEast"` for a bottom-right watermark) or by absolute **`left`/`top`** coordinates,
- **resized** before compositing (handy for scaling a logo),
- **faded** with per-layer `opacity`,
- **tiled** across the whole base image for repeating watermark patterns,
- combined with any of seven **blend modes**.

Layers are painted in array order — the first layer is the bottom-most overlay.

## Functions

### composite

```typescript
function composite(base: Buffer, options: CompositeOptions, asyncOptions?: AsyncOptions): Promise<Buffer>
function compositeSync(base: Buffer, options: CompositeOptions): Buffer
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `base` | `Buffer` | Base image buffer (JPEG, PNG, WebP, etc.) |
| `options` | `CompositeOptions` | Layers and output format |
| `asyncOptions` | `AsyncOptions` | Optional `timeoutMs` and `signal` (async only) |

#### Returns

`Buffer` — the composited image. Defaults to **PNG** (to preserve transparency) unless `output` is set.

#### Example

```typescript
import { composite } from 'imgkit';

const photo = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const logo  = Buffer.from(await Bun.file('logo.png').arrayBuffer());

// Bottom-right watermark at 70% opacity, nudged 20px in from the edges
const out = await composite(photo, {
  layers: [
    { input: logo, gravity: 'southEast', opacity: 0.7, offsetX: -20, offsetY: -20 },
  ],
  output: { format: 'jpeg', jpeg: { quality: 90 } },
});

await Bun.write('watermarked.jpg', out);
```

---

## Types

### CompositeOptions

```typescript
interface CompositeOptions {
  layers: CompositeLayer[];   // Painted in array order (first = bottom-most)
  output?: OutputOptions;     // Default: PNG (preserves alpha)
}
```

### CompositeLayer

```typescript
interface CompositeLayer {
  input: Buffer;          // Encoded layer image (JPEG, PNG, WebP, …)
  gravity?: CropGravity;  // Anchor when left/top not given (default: "center")
  left?: number;          // Absolute X of the layer's top-left (overrides gravity)
  top?: number;           // Absolute Y of the layer's top-left (overrides gravity)
  offsetX?: number;       // Nudge applied after gravity (or tile phase)
  offsetY?: number;       // Nudge applied after gravity (or tile phase)
  opacity?: number;       // 0.0–1.0, multiplied into the layer alpha (default: 1.0)
  blend?: BlendMode;      // Default: "over"
  tile?: boolean;         // Repeat across the whole base (default: false)
  resize?: ResizeOptions; // Optional resize applied before compositing
}
```

### BlendMode

| Mode | Effect |
|------|--------|
| `over` | Normal alpha source-over compositing (default) |
| `multiply` | Darkens — multiplies backdrop and source |
| `screen` | Lightens — inverse of multiply |
| `overlay` | Multiply or screen depending on the backdrop |
| `darken` | Keeps the darker of backdrop/source per channel |
| `lighten` | Keeps the lighter of backdrop/source per channel |
| `add` | Additive blending (clamped to white) |

### Gravity values

`center` (default), `north`, `south`, `east`, `west`, `northWest`, `northEast`, `southWest`, `southEast`.

---

## Placement

There are two ways to position a layer:

1. **Gravity** (default) — anchors the layer to a region of the base, with optional `offsetX`/`offsetY` nudges:

   ```typescript
   { input: logo, gravity: 'southEast', offsetX: -16, offsetY: -16 }
   ```

2. **Absolute coordinates** — `left`/`top` set the layer's top-left corner directly and override gravity. Negative values and off-canvas positions are clipped automatically:

   ```typescript
   { input: logo, left: 24, top: 24 }
   ```

---

## Recipes

### Scaled logo watermark

```typescript
const out = await composite(photo, {
  layers: [
    {
      input: logo,
      gravity: 'southEast',
      resize: { width: 120 },     // scale logo to 120px wide
      opacity: 0.65,
      offsetX: -24,
      offsetY: -24,
    },
  ],
});
```

### Tiled repeating watermark

```typescript
const out = await composite(photo, {
  layers: [
    { input: stamp, tile: true, opacity: 0.15 },
  ],
});
```

### Stacking multiple layers

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

### Blend-mode compositing

```typescript
// Multiply a texture/gradient over a photo
const out = await composite(photo, {
  layers: [{ input: gradient, blend: 'multiply', opacity: 0.5 }],
});
```

---

## Notes

- The base is decoded to RGBA, so the result always supports transparency. Choosing a JPEG `output` flattens any transparency (alpha is dropped, not matted).
- Compositing is performed with the W3C blend-then-source-over formula in linear 8-bit per channel; fully transparent source pixels and fully opaque `over` paints take fast paths.
- For large numbers of layers or huge canvases, prefer the async `composite` so the work runs off the main thread and can be cancelled via `AsyncOptions`.
