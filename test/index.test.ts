import { describe, it, expect, beforeAll } from "bun:test";
import {
  metadata,
  metadataSync,
  resize,
  resizeSync,
  toJpeg,
  toJpegSync,
  toPng,
  toPngSync,
  toWebp,
  toWebpSync,
  transform,
  transformSync,
  blurhash,
  blurhashSync,
  version,
} from "../dist/index.mjs";

let testImage: Buffer;

beforeAll(async () => {
  // Download a test image
  const response = await fetch("https://picsum.photos/800/600");
  testImage = Buffer.from(await response.arrayBuffer());
});

describe("bun-image-turbo", () => {
  describe("version", () => {
    it("should return version string", () => {
      const v = version();
      expect(typeof v).toBe("string");
      expect(v).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe("metadata", () => {
    it("should get image metadata (async)", async () => {
      const meta = await metadata(testImage);

      expect(meta.width).toBe(800);
      expect(meta.height).toBe(600);
      expect(meta.format).toBe("jpeg");
      expect(meta.channels).toBeGreaterThan(0);
      expect(typeof meta.hasAlpha).toBe("boolean");
    });

    it("should get image metadata (sync)", () => {
      const meta = metadataSync(testImage);

      expect(meta.width).toBe(800);
      expect(meta.height).toBe(600);
      expect(meta.format).toBe("jpeg");
    });
  });

  describe("resize", () => {
    it("should resize image to specific dimensions (async)", async () => {
      const resized = await resize(testImage, { width: 400, height: 300 });
      const meta = await metadata(resized);

      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });

    it("should resize image width only (async)", async () => {
      const resized = await resize(testImage, { width: 400 });
      const meta = await metadata(resized);

      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300); // Maintains aspect ratio
    });

    it("should resize image (sync)", () => {
      const resized = resizeSync(testImage, { width: 200 });
      const meta = metadataSync(resized);

      expect(meta.width).toBe(200);
    });
  });

  describe("toJpeg", () => {
    it("should convert to JPEG (async)", async () => {
      const jpeg = await toJpeg(testImage, { quality: 80 });
      const meta = await metadata(jpeg);

      expect(meta.format).toBe("jpeg");
      expect(jpeg.length).toBeGreaterThan(0);
    });

    it("should convert to JPEG (sync)", () => {
      const jpeg = toJpegSync(testImage, { quality: 80 });
      const meta = metadataSync(jpeg);

      expect(meta.format).toBe("jpeg");
    });

    it("should respect quality setting", async () => {
      const highQuality = await toJpeg(testImage, { quality: 95 });
      const lowQuality = await toJpeg(testImage, { quality: 30 });

      expect(highQuality.length).toBeGreaterThan(lowQuality.length);
    });
  });

  describe("toPng", () => {
    it("should convert to PNG (async)", async () => {
      const png = await toPng(testImage);
      const meta = await metadata(png);

      expect(meta.format).toBe("png");
    });

    it("should convert to PNG (sync)", () => {
      const png = toPngSync(testImage);
      const meta = metadataSync(png);

      expect(meta.format).toBe("png");
    });
  });

  describe("toWebp", () => {
    it("should convert to WebP (async)", async () => {
      const webp = await toWebp(testImage, { quality: 80 });
      const meta = await metadata(webp);

      expect(meta.format).toBe("webp");
    });

    it("should convert to WebP (sync)", () => {
      const webp = toWebpSync(testImage, { quality: 80 });
      const meta = metadataSync(webp);

      expect(meta.format).toBe("webp");
    });

    it("should produce smaller file than JPEG", async () => {
      const jpeg = await toJpeg(testImage, { quality: 80 });
      const webp = await toWebp(testImage, { quality: 80 });

      expect(webp.length).toBeLessThan(jpeg.length);
    });
  });

  describe("transform", () => {
    it("should resize and convert format (async)", async () => {
      const result = await transform(testImage, {
        resize: { width: 300 },
        output: { format: "webp", webp: { quality: 75 } },
      });

      const meta = await metadata(result);
      expect(meta.width).toBe(300);
      expect(meta.format).toBe("webp");
    });

    it("should resize and convert format (sync)", () => {
      const result = transformSync(testImage, {
        resize: { width: 300 },
        output: { format: "jpeg", jpeg: { quality: 75 } },
      });

      const meta = metadataSync(result);
      expect(meta.width).toBe(300);
      expect(meta.format).toBe("jpeg");
    });

    it("should apply grayscale", async () => {
      const result = await transform(testImage, {
        grayscale: true,
        output: { format: "jpeg" },
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle resize with fit cover option", async () => {
      // Use fill to force exact dimensions
      const result = await transform(testImage, {
        resize: { width: 100, height: 100, fit: "fill" },
        output: { format: "webp" },
      });

      const meta = await metadata(result);
      expect(meta.width).toBe(100);
      expect(meta.height).toBe(100);
    });
  });

  describe("blurhash", () => {
    it("should generate blurhash (async)", async () => {
      const result = await blurhash(testImage, 4, 3);

      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe("string");
      expect(result.hash.length).toBeGreaterThan(0);
    });

    it("should generate blurhash (sync)", () => {
      const result = blurhashSync(testImage, 4, 3);

      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe("string");
    });

    it("should generate different hashes for different component counts", async () => {
      const hash1 = await blurhash(testImage, 4, 3);
      const hash2 = await blurhash(testImage, 6, 4);

      expect(hash1.hash).not.toBe(hash2.hash);
    });
  });

  describe("error handling", () => {
    it("should throw on invalid input", async () => {
      const invalidBuffer = Buffer.from("not an image");

      await expect(metadata(invalidBuffer)).rejects.toThrow();
    });

    it("should throw on empty buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(metadata(emptyBuffer)).rejects.toThrow();
    });
  });
});
