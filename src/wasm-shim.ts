/**
 * WebAssembly compatibility shim (issue #12).
 *
 * napi-rs implements `async fn` exports on top of a Tokio runtime. On the
 * wasm32-wasip1-threads target that runtime is not currently usable: every
 * Promise-returning export rejects with
 *
 *   "Built-in Tokio async tasks require a threaded WASI target."
 *
 * The synchronous exports work perfectly. Since imgkit's public API is
 * async-first, leaving the async half broken would make the wasm build
 * effectively unusable, so this shim re-implements each async export on top of
 * its `*Sync` counterpart.
 *
 * What this means on wasm, and why it is documented rather than hidden:
 *
 * - async functions still return Promises and still resolve with the same
 *   values, so user code is unchanged;
 * - but the work runs on the calling thread, so it does NOT yield to the event
 *   loop the way the native addon does;
 * - and `timeoutMs` therefore cannot interrupt it. Rather than accept a timeout
 *   it cannot honour, the shim rejects when one is supplied, so a caller
 *   relying on a timeout finds out immediately instead of silently losing it.
 *
 * `codecBackend().wasm` lets callers detect this at runtime, and
 * `docs/guide/wasm.md` documents it.
 *
 * Remove this shim once napi-rs can run its Tokio runtime on wasm.
 */

/**
 * Async export -> number of leading arguments it takes before the trailing
 * optional `timeoutMs`. The sync counterpart is the same name + "Sync" and
 * takes exactly those leading arguments.
 */
const ASYNC_ARITY: Record<string, number> = {
  metadata: 1,
  resize: 2,
  crop: 2,
  toJpeg: 2,
  toPng: 2,
  toWebp: 2,
  transform: 2,
  thumbhashToRgba: 1,
  writeExif: 2,
  stripExif: 1,
  toTensor: 2,
  smartCrop: 2,
  smartCropAnalyze: 2,
  dominantColors: 2,
  thumbnail: 2,
  thumbnailBuffer: 2,
  composite: 2,
  // blurhash(input, componentsX, componentsY, timeoutMs)
  blurhash: 3,
  // thumbhash(input, timeoutMs)
  thumbhash: 1,
  // imageHash(input, algorithm, size, timeoutMs)
  imageHash: 3,
  // imageHashDistance(hash1, hash2, timeoutMs)
  imageHashDistance: 2,
};

/**
 * Wrap a wasm napi module so its async exports are backed by the sync ones.
 *
 * Returns the module unchanged when it is not a wasm build.
 */
export function applyWasmAsyncShim<T extends Record<string, any>>(native: T): T {
  // codecBackend() is itself a sync export, so it is safe to call here.
  let isWasm = false;
  try {
    isWasm = native.codecBackend?.()?.wasm === true;
  } catch {
    return native;
  }
  if (!isWasm) return native;

  for (const [name, arity] of Object.entries(ASYNC_ARITY)) {
    const syncName = `${name}Sync`;
    const syncFn = native[syncName];
    if (typeof syncFn !== "function") continue;

    (native as Record<string, unknown>)[name] = (...args: unknown[]) => {
      // Anything past the declared arity is the optional timeoutMs.
      const timeoutMs = args.length > arity ? args[arity] : undefined;
      if (timeoutMs !== undefined && timeoutMs !== null) {
        return Promise.reject(
          new Error(
            `imgkit: timeoutMs is not supported on the WebAssembly build ` +
              `(${name}). Work runs on the calling thread here, so a timeout ` +
              `cannot interrupt it. Omit timeoutMs, or run the native addon. ` +
              `See https://github.com/nexus-aissam/imgkit/blob/main/docs/guide/wasm.md`
          )
        );
      }
      try {
        return Promise.resolve(syncFn.apply(native, args.slice(0, arity)));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  return native;
}
