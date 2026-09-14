# WebAssembly

imgkit ships a WebAssembly build alongside the native addon. Under Node it is
used automatically on any platform that has no prebuilt binary, so an
unsupported platform degrades instead of failing at import.

It is compiled from the same Rust source as the native addon — there is no second
implementation to drift out of sync — but it swaps the C codecs for pure-Rust
ones. That costs some speed and changes one output detail. Both differences are
detectable at runtime, and this page documents all of them.

Browser and edge support is **not** finished: the artifacts ship, but the entry
point that would make `import 'imgkit'` work in a bundle is
[still to be built](#browser-and-edge-runtimes-not-wired-up-yet).

## Why you might want it

- **Unsupported platforms.** FreeBSD, Linux ARMv7, musl ARM64 and anything else
  without a prebuilt binary now degrade to WebAssembly instead of failing, rather
  than throwing at import time. ✅ available now
- **Reproducible builds.** No `nasm`, no `cmake`, no C toolchain. ✅ available now
- **Browsers** — client-side resize before upload. ⚠️ artifacts ship, but the
  browser entry point is not wired up yet; see below.
- **Edge runtimes** — Cloudflare Workers, Deno Deploy. ⚠️ untested; see below.

If you are on macOS, Linux or Windows under Node or Bun, you do not need this —
the native addon is loaded automatically and is faster.

## How the build is selected

The loader tries every native strategy first and falls back to WebAssembly only
if all of them fail:

1. `IMGKIT_NATIVE_PATH` / `NAPI_RS_NATIVE_LIBRARY_PATH` (explicit override)
2. a `.node` binary beside the package, or the platform optional dependency
3. **WebAssembly** (`wasm/image-turbo.wasi.cjs`)

So the fast path is automatic and the fallback is silent-but-inspectable — call
`codecBackend()` if you need to know which one you got.

## Checking which backend you got

Never infer the backend from `process.platform` — ask the library:

```typescript
import { codecBackend } from 'imgkit';

const b = codecBackend();
// {
//   backend: 'pure-rust',   // or 'native'
//   wasm: true,
//   shrinkOnLoad: false,    // no scaled decode
//   webpLossyEncode: false, // WebP output is lossless
//   heic: false             // no HEIC/HEIF
// }
```

This matters because two of those flags change behaviour you can observe:

```typescript
const opts = codecBackend().webpLossyEncode
  ? { format: 'webp', webp: { quality: 75 } }  // small lossy WebP
  : { format: 'jpeg', jpeg: { quality: 75 } }; // JPEG honours quality everywhere
```

## Browser and edge runtimes: not wired up yet

::: warning Status
This release ships the WebAssembly **artifacts** and the **Node fallback**, both
verified. It does **not** yet ship a working browser entry point. If you `import
imgkit` in a browser bundle today, it will not work.
:::

napi-rs generates `wasm/browser.js` as `export * from 'imgkit-wasm32-wasi'` — a
separate npm package this repo does not publish. Even with that package, the
entry re-exports the **raw** napi module, which would bypass imgkit's TypeScript
layer: the option converters (so `gravity: 'southEast'` never becomes the
`SouthEast` the Rust side expects) and the async shim described below.

Rather than ship a `browser` export condition that resolves to something broken,
it has been left out. Wiring it up properly means building a real browser entry
that instantiates `wasm/image-turbo.wasi-browser.js`, applies the async shim, and
re-exports the `src/api/*` surface — tracked as follow-up work.

What you *can* rely on today:

- Node, on any platform with no prebuilt native addon, automatically falls back
  to WebAssembly. Verified by installing the packed tarball into a clean project.
- The crate builds with zero C dependencies (`--no-default-features`), which is
  what makes any of this possible.
- The `.wasm` module and both loaders are published in the package, so anyone
  wiring a browser or edge integration has the artifacts to do it.

Edge runtimes (Cloudflare Workers, Deno Deploy) are **untested**. Note that
`wasm/image-turbo.wasi.cjs` requires `node:worker_threads` and `node:fs`, which
Workers do not provide even with `nodejs_compat`, so that path likely needs the
browser loader plus a custom entry rather than the Node one.

## What differs from the native build

| | Native | WebAssembly |
|---|---|---|
| JPEG codec | libjpeg-turbo (SIMD) | zune-jpeg (pure Rust) |
| WebP codec | libwebp | image-rs (pure Rust) |
| PNG / GIF / BMP / TIFF | image-rs | image-rs (identical) |
| Shrink-on-load | ✅ decodes at 1/2, 1/4, 1/8 | ❌ full decode, then resize |
| Lossy WebP encode | ✅ honours `quality` | ❌ **lossless only** |
| JPEG `quality` | ✅ | ✅ |
| HEIC/HEIF decode | ✅ (macOS ARM64 builds) | ❌ |
| Async off-thread | ✅ | ❌ runs on the calling thread |
| `timeoutMs` | ✅ | ❌ rejects, see below |
| `AbortSignal` | ✅ | ✅ (pre-flight only) |

Everything else — resize filters, crop, smart crop, composite, blurhash,
thumbhash, perceptual hashing, dominant colors, tensors, EXIF — behaves
identically, because it is the same Rust code.

### Lossless-only WebP

`image`'s WebP encoder has no lossy mode. On WebAssembly,
`toWebp(buf, { quality: 60 })` produces a **lossless** WebP and `quality` is
ignored. The output is a valid WebP that decodes everywhere; it is simply larger
than a native lossy encode — often several times larger for photographs.

Check `codecBackend().webpLossyEncode` before relying on `quality`, and prefer
JPEG for lossy output on this backend. This is asserted by the test suite, so if
a future release gains a lossy encoder the tests fail and this page gets updated
with it.

### No shrink-on-load

The native build asks the JPEG/WebP decoder for a half/quarter/eighth-size image
and skips most of the pixel work — this is what makes `thumbnail()` fast. Neither
pure-Rust decoder exposes a scaled-decode API, so the WebAssembly build decodes
at full resolution and then resizes.

The **output is identical**; it just costs more time and memory. The gap widens
with input size, so a 200px thumbnail of a 12 MP photo is where you will notice
it most.

### Async functions run on the calling thread

napi-rs implements its async exports on a Tokio runtime that does not currently
work on `wasm32-wasip1-threads`. The raw module rejects every Promise-returning
export with *"Built-in Tokio async tasks require a threaded WASI target"*.

imgkit works around this in `src/wasm-shim.ts` by re-implementing each async
export on top of its synchronous counterpart, so this still works unchanged:

```typescript
const out = await resize(buf, { width: 800 }); // ✅ resolves
```

But the work happens on the calling thread rather than a worker, so it does not
yield to the event loop. On a server, be aware that a large image will block
that isolate for the duration.

### `timeoutMs` is rejected, not ignored

Because the work is synchronous underneath, a timeout cannot interrupt it.
Rather than accept a `timeoutMs` it cannot honour, the WebAssembly build rejects:

```typescript
await resize(buf, { width: 800 }, { timeoutMs: 5000 });
// ❌ Error: imgkit: timeoutMs is not supported on the WebAssembly build
```

Omit it, or branch on the backend:

```typescript
const asyncOpts = codecBackend().wasm ? {} : { timeoutMs: 5000 };
await resize(buf, { width: 800 }, asyncOpts);
```

This is deliberate. Silently dropping a timeout would leave callers believing
they had a guarantee they did not have.

`AbortSignal` still works for the pre-flight case — an already-aborted signal
rejects immediately — but cannot interrupt work in progress.

### Bun cannot load the wasm build

napi-rs emits a *reactor*-style WebAssembly module, which requires
`WASI.initialize()`. Bun's `node:wasi` currently implements only `start()`:

```
Node: constructor, finalizeBindings, start, initialize, getImportObject
Bun:  constructor, getState, setState, …, start, getImports
```

This does not affect Bun users in practice — Bun loads the native addon, which is
faster anyway — but it does mean the WebAssembly test suite runs under
`node --test` rather than `bun test`.

## Performance expectations

Expect WebAssembly to be meaningfully slower than the native addon. The gap comes
from three places, roughly in order of impact:

1. **No shrink-on-load** — the biggest factor for thumbnailing, since the decoder
   processes every pixel of the original.
2. **No SIMD JPEG** — libjpeg-turbo uses SSE2/AVX2/NEON; zune-jpeg is scalar.
3. **No off-thread execution** — no overlap between concurrent calls.

It is still fast enough for interactive client-side work, and it is doing the job
in a place the native addon simply cannot run. For server-side batch processing,
use the native build.

## Troubleshooting

**`SharedArrayBuffer is not defined`**
The module is built for `wasm32-wasip1-threads` and uses shared memory. In a
browser that requires a cross-origin isolated page (`Cross-Origin-Opener-Policy:
same-origin` plus `Cross-Origin-Embedder-Policy: require-corp`) — but see the
browser status note above before going further.

**`symbol exported via --export not found: emnapi_create_env`**
Your emnapi is on the 1.x line. The build needs `emnapi@2.0.0-alpha.x` — see
[Toolchain requirement](#toolchain-requirement-emnapi-2-x).

**`emnapi version mismatch`**
`emnapi`, `@emnapi/core` and `@emnapi/runtime` must all be on the *same* version.

**`wasi.initialize is not a function`**
You are running the WebAssembly build under Bun. Use Node, or let Bun load the
native addon.

**`timeoutMs is not supported on the WebAssembly build`**
Working as intended — see [above](#timeoutms-is-rejected-not-ignored).

**HEIC images fail to decode**
HEIC needs libheif, a C library, so it is native-only. Convert to JPEG first.

## Building it yourself

```bash
rustup target add wasm32-wasip1-threads
bun install
bun run build:wasm
```

Output lands in `wasm/`:

| File | Purpose |
|---|---|
| `image-turbo.wasm32-wasi.wasm` | the module (~3.2 MB) |
| `image-turbo.wasi.cjs` | Node loader |
| `image-turbo.wasi-browser.js` | browser ESM loader |
| `wasi-worker.mjs`, `wasi-worker-browser.mjs` | thread workers |
| `browser.js` | browser entry point |

Under the hood this is the crate built with `--no-default-features`, which turns
off the `native-codecs` feature and selects the pure-Rust codecs. That same flag
works for an ordinary native build if you want one without a C toolchain:

```bash
cargo build --release --no-default-features
```

### Toolchain requirement: emnapi 2.x

The build needs **emnapi 2.0.0-alpha.x**, not the current `latest` (1.11.3):

- `napi-build` 2.4.2 links against `emnapi_create_env` / `emnapi_delete_env`,
  which emnapi 1.11.3 does not define — linking fails with
  `symbol exported via --export not found`.
- `emnapi`, `@emnapi/core` and `@emnapi/runtime` must all be on the **same**
  version or `napi build` refuses to start.

These are pinned in `devDependencies` and can move to stable once emnapi 2.x
ships.

## Testing

```bash
bun run build:wasm
bun run build:ts
bun run test:wasm     # node --test test/wasm/
```

The WebAssembly suite is hermetic: fixtures are generated in-process by a small
PNG encoder, so it needs no network access and no binary files in the repository.
It covers the raw wasm module, the public API through `dist/`, `codecBackend()`,
and both documented degradations.

The Rust unit tests run under both codec backends:

```bash
bun run test:rust         # native codecs
bun run test:rust:pure    # pure-Rust codecs (what WebAssembly uses)
```
