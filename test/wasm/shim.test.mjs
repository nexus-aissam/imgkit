/**
 * End-to-end test of the public TypeScript API running on the WebAssembly build
 * (issue #12).
 *
 * `wasm.test.ts` exercises the raw napi module. This file goes through the real
 * entry point - `dist/index.mjs` -> `src/loader.ts` -> wasm fallback ->
 * `src/wasm-shim.ts` - so it verifies the path an actual user takes when no
 * native addon is present for their platform.
 *
 * Prerequisites:
 *   bun run build:wasm && bun run build:ts
 *
 * Note this only reaches the wasm fallback when no `.node` binary is present.
 * When a native addon IS built locally the loader finds it first, so the suite
 * detects that and asserts the native expectations instead.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gradientPng, makePng } from "./make-png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let imgkit;
let png;
let onWasm = false;

before(async () => {
  if (!existsSync(join(ROOT, "dist", "index.mjs"))) {
    throw new Error("dist not built. Run: bun run build:ts");
  }
  imgkit = await import(join(ROOT, "dist", "index.mjs"));
  png = gradientPng(64, 48);
  // The loader picks native when available and wasm otherwise; either is valid.
  onWasm = imgkit.default?.codecBackend
    ? imgkit.default.codecBackend().wasm
    : false;
});

describe("public API via dist", () => {
  it("loads through the real entry point", () => {
    assert.equal(typeof imgkit.resize, "function");
    assert.equal(typeof imgkit.metadata, "function");
    assert.equal(typeof imgkit.version, "function");
  });

  it("reports a coherent backend", () => {
    const b = imgkit.default.codecBackend();
    assert.ok(b.backend === "native" || b.backend === "pure-rust");
    // The wasm build is always the pure-Rust one; the reverse need not hold.
    if (b.wasm) assert.equal(b.backend, "pure-rust");
  });

  describe("async API", () => {
    // This is the point of the shim: on wasm the underlying napi async exports
    // are broken, but the public async API must still work.
    it("await metadata() resolves", async () => {
      const m = await imgkit.metadata(png);
      assert.equal(m.width, 64);
      assert.equal(m.height, 48);
      assert.equal(m.format, "png");
    });

    it("await resize() resolves with a correctly sized image", async () => {
      const out = await imgkit.resize(png, { width: 16 });
      const m = await imgkit.metadata(out);
      assert.equal(m.width, 16);
      assert.equal(m.height, 12);
    });

    it("await toWebp() resolves", async () => {
      const out = await imgkit.toWebp(png, { quality: 80 });
      assert.equal((await imgkit.metadata(out)).format, "webp");
    });

    it("await transform() runs the full pipeline", async () => {
      const out = await imgkit.transform(png, {
        crop: { aspectRatio: "1:1" },
        resize: { width: 24 },
        output: { format: "webp" },
      });
      const m = await imgkit.metadata(out);
      assert.equal(m.format, "webp");
      assert.equal(m.width, 24);
    });

    it("await composite() overlays a layer", async () => {
      const logo = makePng(16, 16, () => [255, 0, 0]);
      const out = await imgkit.composite(png, {
        layers: [{ input: logo, gravity: "southEast", opacity: 0.7 }],
      });
      assert.equal((await imgkit.metadata(out)).width, 64);
    });

    it("await thumbhash() returns a usable data URL", async () => {
      const r = await imgkit.thumbhash(png);
      assert.ok(r.dataUrl.startsWith("data:image/"));
    });
  });

  describe("sync API", () => {
    it("resizeSync works", () => {
      assert.equal(imgkit.metadataSync(imgkit.resizeSync(png, { width: 8 })).width, 8);
    });
  });

  describe("timeoutMs behaviour", () => {
    it("is rejected with a clear message on wasm, honoured on native", async () => {
      if (onWasm) {
        // The shim refuses a timeout it cannot enforce rather than silently
        // dropping it, so callers relying on one find out immediately.
        await assert.rejects(
          async () => imgkit.resize(png, { width: 8 }, { timeoutMs: 5000 }),
          /timeoutMs is not supported on the WebAssembly build/
        );
      } else {
        const out = await imgkit.resize(png, { width: 8 }, { timeoutMs: 30_000 });
        assert.equal(imgkit.metadataSync(out).width, 8);
      }
    });
  });

  describe("AbortSignal", () => {
    it("rejects when the signal is already aborted", async () => {
      const ac = new AbortController();
      ac.abort();
      await assert.rejects(async () =>
        imgkit.resize(png, { width: 8 }, { signal: ac.signal })
      );
    });
  });
});
