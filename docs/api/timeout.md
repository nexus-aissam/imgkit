# Timeout & Cancellation

All async functions in imgkit support timeout and cancellation via `AsyncOptions`.

## AsyncOptions

```typescript
interface AsyncOptions {
  /** Timeout in milliseconds. Operation rejects after this duration. */
  timeoutMs?: number;
  /** AbortSignal for cancellation. Operation rejects when signal is aborted. */
  signal?: AbortSignal;
}
```

Every async function accepts `AsyncOptions` as its **last parameter**. Sync functions are unaffected.

## Timeout

Set `timeoutMs` to reject the promise if the operation exceeds the specified duration.

```typescript
import { resize, toWebp, metadata } from 'imgkit';

// Reject after 5 seconds
const resized = await resize(buffer, { width: 800 }, { timeoutMs: 5000 });

// Works with all async functions
const info = await metadata(buffer, { timeoutMs: 1000 });
const webp = await toWebp(buffer, { quality: 85 }, { timeoutMs: 10000 });
```

When a timeout occurs, the promise rejects with an error containing `"timed out"` in the message:

```typescript
try {
  await resize(buffer, { width: 100 }, { timeoutMs: 1 });
} catch (e) {
  console.log(e.message); // "Operation timed out after 1ms"
}
```

::: tip Behavior Note
The timeout stops the JavaScript promise from waiting, but the underlying Rust processing thread continues until completion. This is the same tradeoff used by `sharp`, `fetch()`, and other tools built on `spawn_blocking`.
:::

## AbortSignal

Use an `AbortSignal` to cancel operations from your code.

### AbortController

```typescript
import { transform } from 'imgkit';

const controller = new AbortController();

const promise = transform(buffer, {
  resize: { width: 1920 },
  output: { format: 'webp', webp: { quality: 85 } }
}, { signal: controller.signal });

// Cancel the operation (e.g., user navigated away)
controller.abort();

try {
  await promise;
} catch (e) {
  console.log(e.name); // "AbortError"
}
```

### AbortSignal.timeout()

Use the built-in `AbortSignal.timeout()` for a signal-based timeout:

```typescript
import { resize } from 'imgkit';

// Rejects with TimeoutError after 3 seconds
const result = await resize(buffer, { width: 800 }, {
  signal: AbortSignal.timeout(3000)
});
```

### Custom Abort Reason

```typescript
const controller = new AbortController();
controller.abort(new Error('User cancelled'));

try {
  await resize(buffer, { width: 100 }, { signal: controller.signal });
} catch (e) {
  console.log(e.message); // "User cancelled"
}
```

### Already-Aborted Signal

If the signal is already aborted when the function is called, it rejects immediately without starting the operation:

```typescript
const controller = new AbortController();
controller.abort();

// Rejects immediately — no work is started
await resize(buffer, { width: 100 }, { signal: controller.signal });
```

## Combining Timeout and AbortSignal

You can use both `timeoutMs` and `signal` together. The operation rejects as soon as **either** triggers:

```typescript
const controller = new AbortController();

const result = await resize(buffer, { width: 800 }, {
  timeoutMs: 10000,        // Rust-level timeout (10s)
  signal: controller.signal // JS-level cancellation
});
```

- `timeoutMs` — handled in Rust via tokio, most efficient for pure time limits
- `signal` — handled in JavaScript, best for programmatic cancellation (user actions, cleanup)

## Supported Functions

All async functions support `AsyncOptions`:

| Function | Signature |
|----------|-----------|
| `metadata()` | `metadata(input, asyncOptions?)` |
| `resize()` | `resize(input, options, asyncOptions?)` |
| `crop()` | `crop(input, options, asyncOptions?)` |
| `toJpeg()` | `toJpeg(input, options?, asyncOptions?)` |
| `toPng()` | `toPng(input, options?, asyncOptions?)` |
| `toWebp()` | `toWebp(input, options?, asyncOptions?)` |
| `transform()` | `transform(input, options, asyncOptions?)` |
| `blurhash()` | `blurhash(input, cx?, cy?, asyncOptions?)` |
| `thumbhash()` | `thumbhash(input, asyncOptions?)` |
| `thumbhashToRgba()` | `thumbhashToRgba(hash, asyncOptions?)` |
| `imageHash()` | `imageHash(input, options?, asyncOptions?)` |
| `imageHashDistance()` | `imageHashDistance(h1, h2, asyncOptions?)` |
| `smartCrop()` | `smartCrop(input, options, asyncOptions?)` |
| `smartCropAnalyze()` | `smartCropAnalyze(input, options, asyncOptions?)` |
| `dominantColors()` | `dominantColors(input, count?, asyncOptions?)` |
| `toTensor()` | `toTensor(input, options?, asyncOptions?)` |
| `writeExif()` | `writeExif(input, options, asyncOptions?)` |
| `stripExif()` | `stripExif(input, asyncOptions?)` |
| `thumbnail()` | `thumbnail(input, options, asyncOptions?)` |
| `thumbnailBuffer()` | `thumbnailBuffer(input, options, asyncOptions?)` |

## Use Cases

### HTTP Server with Request Timeout

```typescript
import { resize, toWebp } from 'imgkit';

Bun.serve({
  async fetch(req) {
    const controller = new AbortController();

    // Cancel if client disconnects
    req.signal.addEventListener('abort', () => controller.abort());

    try {
      const buffer = Buffer.from(await req.arrayBuffer());
      const resized = await resize(buffer, { width: 400 }, {
        timeoutMs: 5000,
        signal: controller.signal,
      });
      const webp = await toWebp(resized, { quality: 85 }, {
        timeoutMs: 5000,
        signal: controller.signal,
      });
      return new Response(webp, {
        headers: { 'Content-Type': 'image/webp' }
      });
    } catch (e) {
      return new Response('Processing failed', { status: 500 });
    }
  }
});
```

### Batch Processing with Global Timeout

```typescript
import { thumbnail } from 'imgkit';

const signal = AbortSignal.timeout(30000); // 30s for entire batch

const results = await Promise.allSettled(
  images.map(buf =>
    thumbnail(buf, { width: 200 }, { signal })
  )
);
```
