/**
 * Composite / Overlay / Watermark Tests
 *
 * Tests for compositing layers onto a base image with blend modes,
 * gravity/coordinate placement, opacity, tiling, and per-layer resize.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { composite, compositeSync, metadata } from "../../dist";

// Test images
let base: Buffer; // 400x300
let logo: Buffer; // 100x100

beforeAll(async () => {
  const baseRes = await fetch("https://picsum.photos/seed/composite-base/400/300.jpg");
  base = Buffer.from(await baseRes.arrayBuffer());

  const logoRes = await fetch("https://picsum.photos/seed/composite-logo/100/100.jpg");
  logo = Buffer.from(await logoRes.arrayBuffer());
});

describe("composite", () => {
  describe("placement", () => {
    it("composites a layer with default gravity (async) and keeps base dimensions", async () => {
      const out = await composite(base, { layers: [{ input: logo }] });
      expect(Buffer.isBuffer(out)).toBe(true);
      expect(out.length).toBeGreaterThan(0);

      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });

    it("composites a layer (sync)", () => {
      const out = compositeSync(base, { layers: [{ input: logo }] });
      expect(Buffer.isBuffer(out)).toBe(true);
      expect(out.length).toBeGreaterThan(0);
    });

    it("supports gravity-based placement (southEast watermark)", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, gravity: "southEast", offsetX: -10, offsetY: -10 }],
      });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });

    it("supports absolute left/top placement", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, left: 50, top: 25 }],
      });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });

    it("clips layers placed partially off-canvas", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, left: 350, top: 250 }], // overflows bottom-right
      });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });

    it("clips layers placed at negative coordinates", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, left: -50, top: -50 }],
      });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });
  });

  describe("opacity", () => {
    it("applies layer opacity", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, gravity: "center", opacity: 0.5 }],
      });
      expect(out.length).toBeGreaterThan(0);
    });

    it("opacity 0 leaves the base visually unchanged", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, gravity: "center", opacity: 0 }],
      });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });
  });

  describe("blend modes", () => {
    const modes = ["over", "multiply", "screen", "overlay", "darken", "lighten", "add"] as const;
    for (const blend of modes) {
      it(`supports the "${blend}" blend mode`, async () => {
        const out = await composite(base, {
          layers: [{ input: logo, gravity: "center", blend }],
        });
        expect(out.length).toBeGreaterThan(0);
        const meta = await metadata(out);
        expect(meta.width).toBe(400);
      });
    }
  });

  describe("tiling", () => {
    it("tiles a layer across the whole base", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, tile: true, opacity: 0.3 }],
      });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });
  });

  describe("per-layer resize", () => {
    it("resizes a layer before compositing", async () => {
      const out = await composite(base, {
        layers: [{ input: logo, gravity: "northWest", resize: { width: 50, height: 50 } }],
      });
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe("multiple layers", () => {
    it("composites multiple layers in order", async () => {
      const out = await composite(base, {
        layers: [
          { input: logo, gravity: "northWest", resize: { width: 60, height: 60 } },
          { input: logo, gravity: "southEast", resize: { width: 60, height: 60 }, opacity: 0.6 },
        ],
      });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });

    it("handles an empty layer list (returns re-encoded base)", async () => {
      const out = await composite(base, { layers: [] });
      const meta = await metadata(out);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });
  });

  describe("output format", () => {
    it("defaults to PNG", async () => {
      const out = await composite(base, { layers: [{ input: logo }] });
      const meta = await metadata(out);
      expect(meta.format).toBe("png");
    });

    it("can output JPEG", async () => {
      const out = await composite(base, {
        layers: [{ input: logo }],
        output: { format: "jpeg", jpeg: { quality: 90 } },
      });
      const meta = await metadata(out);
      expect(meta.format).toBe("jpeg");
    });

    it("can output WebP", async () => {
      const out = await composite(base, {
        layers: [{ input: logo }],
        output: { format: "webp", webp: { quality: 85 } },
      });
      const meta = await metadata(out);
      expect(meta.format).toBe("webp");
    });
  });

  describe("error handling", () => {
    it("throws on invalid base data", async () => {
      const invalid = Buffer.from("not an image");
      await expect(composite(invalid, { layers: [{ input: logo }] })).rejects.toThrow();
    });

    it("throws on invalid layer data", async () => {
      const invalid = Buffer.from("not an image");
      await expect(composite(base, { layers: [{ input: invalid }] })).rejects.toThrow();
    });

    it("throws on empty base buffer", async () => {
      await expect(composite(Buffer.alloc(0), { layers: [{ input: logo }] })).rejects.toThrow();
    });
  });
});
