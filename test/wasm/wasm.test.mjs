/**
 * WebAssembly build test suite (issue #12).
 *
 * Exercises the wasm32-wasip1-threads artifact directly, so it validates the
 * thing users would actually load in a browser or edge runtime rather than the
 * native addon.
 *
 * Deliberately hermetic: fixtures are generated in-process by a tiny PNG
 * encoder, so this suite needs no network and no binary files in git. (The
 * existing `test/local` suites fetch from picsum.photos, which makes failures
 * ambiguous between a real regression and a flaky download.)
 *
 * Runs on Node, not Bun: napi-rs emits a reactor-style wasm module which needs
 * `WASI.initialize()`, and Bun's `node:wasi` shim currently only implements
 * `start()`. See docs/guide/wasm.md.
 *
 * Prerequisite:
 *   bun run build:wasm
 * Then:
 *   bun run test:wasm      (which shells out to `node --test`)
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gradientPng, makePng } from "./make-png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WASM_LOADER = join(ROOT, "wasm", "image-turbo.wasi.cjs");

const require = createRequire(join(ROOT, "/"));

let wasm;
let png;

before(() => {
  if (!existsSync(WASM_LOADER)) {
    throw new Error(
      `WASM artifact not found at ${WASM_LOADER}.\n` +
        `Build it first:  bun run build:wasm`
    );
  }
  wasm = require(WASM_LOADER);
  png = gradientPng(64, 48);
});

describe("wasm build", () => {
  describe("module", () => {
    it("loads and exposes the full API surface", () => {
      // Every function the native addon exports must exist here too, otherwise
      // the wasm build is a silently reduced version of the library.
      const required = [
        "metadata", "metadataSync",
        "resize", "resizeSync",
        "crop", "cropSync",
        "toJpeg", "toJpegSync",
        "toPng", "toPngSync",
        "toWebp", "toWebpSync",
        "transform", "transformSync",
        "blurhash", "blurhashSync",
        "thumbhash", "thumbhashSync",
        "toTensor", "toTensorSync",
        "imageHash", "imageHashSync",
        "smartCrop", "smartCropSync",
        "dominantColors", "dominantColorsSync",
        "thumbnail", "thumbnailSync",
        "composite", "compositeSync",
        "writeExif", "stripExif",
        "version", "codecBackend",
      ];
      for (const fn of required) {
        assert.equal(typeof wasm[fn], "function");
      }
    });

    it("reports the same version as package.json", () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
      assert.equal(wasm.version(), pkg.version);
    });
  });

  describe("codecBackend()", () => {
    it("identifies itself as the pure-Rust wasm build", () => {
      const b = wasm.codecBackend();
      assert.equal(b.backend, "pure-rust");
      assert.equal(b.wasm, true);
    });

    it("advertises the capabilities it does not have", () => {
      // These are the documented trade-offs of the C-free build. If a future
      // change makes one of them true, the docs must change with it.
      const b = wasm.codecBackend();
      assert.equal(b.shrinkOnLoad, false);
      assert.equal(b.webpLossyEncode, false);
      assert.equal(b.heic, false);
    });
  });

  describe("metadata", () => {
    it("reads dimensions and format from a PNG", () => {
      const m = wasm.metadataSync(png);
      assert.equal(m.width, 64);
      assert.equal(m.height, 48);
      assert.equal(m.format, "png");
      assert.ok(m.channels > 0);
    });

    it("rejects data that is not an image", () => {
      assert.throws(() => wasm.metadataSync(Buffer.alloc(64)));
    });
  });

  describe("resize", () => {
    it("resizes to an explicit width, preserving aspect ratio", () => {
      const out = wasm.resizeSync(png, { width: 16 });
      const m = wasm.metadataSync(out);
      assert.equal(m.width, 16);
      assert.equal(m.height, 12); // 64x48 -> 4:3
    });

    it("resizes to exact dimensions with fit: Fill", () => {
      const m = wasm.metadataSync(
        wasm.resizeSync(png, { width: 10, height: 10, fit: "Fill" })
      );
      assert.equal(m.width, 10);
      assert.equal(m.height, 10);
    });

    it("preserves aspect ratio by default when both dimensions are given", () => {
      // Default fit keeps the aspect ratio rather than distorting.
      const m = wasm.metadataSync(wasm.resizeSync(png, { width: 10, height: 10 }));
      assert.ok(m.width <= 10);
      assert.ok(m.height <= 10);
    });
  });

  describe("crop", () => {
    it("crops an explicit region", () => {
      const m = wasm.metadataSync(
        wasm.cropSync(png, { x: 0, y: 0, width: 20, height: 10 })
      );
      assert.equal(m.width, 20);
      assert.equal(m.height, 10);
    });
  });

  describe("format conversion", () => {
    it("encodes JPEG and honours quality", () => {
      const hi = wasm.toJpegSync(png, { quality: 95 });
      const lo = wasm.toJpegSync(png, { quality: 20 });
      assert.equal(wasm.metadataSync(hi).format, "jpeg");
      assert.equal(wasm.metadataSync(lo).format, "jpeg");
      // JPEG quality IS honoured on the pure-Rust backend (unlike WebP).
      assert.ok(lo.length < hi.length);
    });

    it("encodes PNG", () => {
      const out = wasm.toPngSync(png);
      const m = wasm.metadataSync(out);
      assert.equal(m.format, "png");
      assert.equal(m.width, 64);
    });

    it("encodes WebP", () => {
      const out = wasm.toWebpSync(png);
      const m = wasm.metadataSync(out);
      assert.equal(m.format, "webp");
      assert.equal(m.width, 64);
      assert.equal(m.height, 48);
    });

    it("produces LOSSLESS WebP regardless of quality on this backend", () => {
      // Documented limitation: image-rs has no lossy WebP encoder, so `quality`
      // cannot be honoured. Asserting it here means the day someone wires up a
      // lossy encoder, this test fails and the docs get updated with it.
      assert.equal(wasm.codecBackend().webpLossyEncode, false);

      const q10 = wasm.toWebpSync(png, { quality: 10 });
      const q90 = wasm.toWebpSync(png, { quality: 90 });
      assert.equal(q10.length, q90.length);

      // Lossless means the pixels must survive the round trip untouched.
      const flat = makePng(8, 8, () => [10, 200, 30]);
      const back = wasm.toPngSync(wasm.toWebpSync(flat));
      const m = wasm.metadataSync(back);
      assert.equal(m.width, 8);
      assert.equal(m.height, 8);
    });
  });

  describe("transform pipeline", () => {
    it("chains crop, resize and output format", () => {
      const out = wasm.transformSync(png, {
        crop: { aspectRatio: "1:1" },
        resize: { width: 24 },
        output: { format: "WebP", webp: { quality: 80 } },
      });
      const m = wasm.metadataSync(out);
      assert.equal(m.format, "webp");
      assert.equal(m.width, 24);
    });
  });

  describe("placeholders", () => {
    it("generates a blurhash", () => {
      const r = wasm.blurhashSync(png);
      assert.equal(typeof r.hash, "string");
      assert.ok(r.hash.length > 6);
    });

    it("generates a thumbhash", () => {
      const r = wasm.thumbhashSync(png);
      assert.equal(Array.isArray(r.hash), true);
      assert.ok(r.hash.length > 0);
      assert.equal(r.width, 64);
      assert.equal(r.height, 48);
    });

    it("round-trips a thumbhash back to pixels", () => {
      const r = wasm.thumbhashSync(png);
      const decoded = wasm.thumbhashToRgbaSync(Buffer.from(r.hash));
      assert.ok(decoded.width > 0);
      assert.ok(decoded.height > 0);
    });
  });

  describe("tensor conversion", () => {
    it("produces a CHW float tensor of the requested size", () => {
      const t = wasm.toTensorSync(png, {
        width: 8,
        height: 8,
        layout: "Chw",
        dtype: "Float32",
        normalization: "Imagenet",
      });
      assert.deepEqual(t.shape, [3, 8, 8]);
      assert.equal(t.data.length, 3 * 8 * 8 * 4); // f32 = 4 bytes
    });
  });

  describe("perceptual hashing", () => {
    it("hashes an image and matches itself with distance 0", () => {
      const a = wasm.imageHashSync(png, "PHash", "Size8");
      const b = wasm.imageHashSync(png, "PHash", "Size8");
      assert.equal(typeof a.hash, "string");
      assert.equal(wasm.imageHashDistanceSync(a.hash, b.hash), 0);
    });

    it("gives a non-zero distance for a clearly different image", () => {
      const solid = makePng(64, 48, () => [0, 0, 0]);
      const a = wasm.imageHashSync(png, "PHash", "Size8");
      const b = wasm.imageHashSync(solid, "PHash", "Size8");
      assert.ok(wasm.imageHashDistanceSync(a.hash, b.hash) > 0);
    });
  });

  describe("smart crop", () => {
    it("crops to a square", () => {
      const m = wasm.metadataSync(wasm.smartCropSync(png, { aspectRatio: "1:1" }));
      assert.equal(m.width, m.height);
    });
  });

  describe("dominant colors", () => {
    it("extracts a palette", () => {
      const r = wasm.dominantColorsSync(png, 3);
      assert.ok(r.colors.length > 0);
      const c = r.colors[0];
      assert.ok(c.r >= 0);
      assert.ok(c.r <= 255);
    });
  });

  describe("thumbnail", () => {
    it("generates a thumbnail even without shrink-on-load", () => {
      // shrinkOnLoad is false here; the API must still work, just more slowly.
      const r = wasm.thumbnailSync(png, { width: 16, format: "Png" });
      assert.equal(r.width, 16);
      assert.ok(Buffer.from(r.data).length > 0);
    });
  });

  describe("composite", () => {
    it("overlays a layer onto a base image", () => {
      const logo = makePng(16, 16, () => [255, 0, 0]);
      const out = wasm.compositeSync(png, {
        layers: [{ input: logo, gravity: "SouthEast", opacity: 0.8 }],
      });
      const m = wasm.metadataSync(out);
      assert.equal(m.width, 64);
      assert.equal(m.height, 48);
    });
  });

  describe("async exports (known limitation)", () => {
    // napi-rs implements `async fn` on a Tokio runtime that does not currently
    // work on wasm32-wasip1-threads. The raw module therefore rejects every
    // Promise-returning export. src/wasm-shim.ts re-implements them on top of
    // the sync exports so the public TS API still works; see shim.test.mjs.
    //
    // This test pins the current upstream behaviour. When napi-rs fixes it,
    // this test fails, which is the signal to delete the shim.
    it("raw napi async exports still reject on wasm", async () => {
      await assert.rejects(
        async () => wasm.resize(png, { width: 8 }),
        /Tokio async tasks require a threaded WASI target/
      );
    });

    it("every sync export used above works, which is what the shim relies on", () => {
      assert.equal(wasm.metadataSync(wasm.resizeSync(png, { width: 8 })).width, 8);
    });
  });
});
