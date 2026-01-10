import { describe, it, expect, beforeAll } from "bun:test";
import {
  thumbhash,
  thumbhashSync,
  thumbhashToRgba,
  thumbhashToRgbaSync,
  thumbhashToDataUrl,
  toPng,
} from "../../dist/index.mjs";

let testImageJpeg: Buffer;
let testImagePng: Buffer;

beforeAll(async () => {
  // Download test images
  const jpegResponse = await fetch("https://picsum.photos/200/150");
  testImageJpeg = Buffer.from(await jpegResponse.arrayBuffer());

  // Create a simple PNG with transparency for alpha testing
  // Use a smaller image for faster processing
  const pngResponse = await fetch("https://picsum.photos/100/75");
  testImagePng = await toPng(Buffer.from(await pngResponse.arrayBuffer()));
});

describe("thumbhash", () => {
  describe("thumbhash generation", () => {
    it("should generate thumbhash from JPEG (async)", async () => {
      const result = await thumbhash(testImageJpeg);

      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.hash.length).toBeLessThanOrEqual(30); // ThumbHash is typically ~25 bytes
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      expect(typeof result.hasAlpha).toBe("boolean");
      expect(typeof result.dataUrl).toBe("string");
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it("should generate thumbhash from JPEG (sync)", () => {
      const result = thumbhashSync(testImageJpeg);

      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      expect(typeof result.dataUrl).toBe("string");
    });

    it("should generate thumbhash from PNG (async)", async () => {
      const result = await thumbhash(testImagePng);

      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.width).toBe(100);
      expect(result.height).toBe(75);
    });

    it("should generate thumbhash from PNG (sync)", () => {
      const result = thumbhashSync(testImagePng);

      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.width).toBe(100);
      expect(result.height).toBe(75);
    });
  });

  describe("thumbhash decoding", () => {
    it("should decode thumbhash to RGBA (async)", async () => {
      const { hash } = await thumbhash(testImageJpeg);
      const decoded = await thumbhashToRgba(hash);

      expect(decoded.rgba).toBeInstanceOf(Buffer);
      expect(decoded.width).toBeGreaterThan(0);
      expect(decoded.height).toBeGreaterThan(0);
      // RGBA = 4 bytes per pixel
      expect(decoded.rgba.length).toBe(decoded.width * decoded.height * 4);
    });

    it("should decode thumbhash to RGBA (sync)", () => {
      const { hash } = thumbhashSync(testImageJpeg);
      const decoded = thumbhashToRgbaSync(hash);

      expect(decoded.rgba).toBeInstanceOf(Buffer);
      expect(decoded.width).toBeGreaterThan(0);
      expect(decoded.height).toBeGreaterThan(0);
      expect(decoded.rgba.length).toBe(decoded.width * decoded.height * 4);
    });
  });

  describe("thumbhash to data URL", () => {
    it("should convert thumbhash to data URL", () => {
      const { hash } = thumbhashSync(testImageJpeg);
      const dataUrl = thumbhashToDataUrl(hash);

      expect(typeof dataUrl).toBe("string");
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify it's valid base64
      const base64 = dataUrl.replace("data:image/png;base64,", "");
      expect(() => Buffer.from(base64, "base64")).not.toThrow();
    });

    it("should produce consistent data URLs", () => {
      const { hash } = thumbhashSync(testImageJpeg);
      const dataUrl1 = thumbhashToDataUrl(hash);
      const dataUrl2 = thumbhashToDataUrl(hash);

      expect(dataUrl1).toBe(dataUrl2);
    });
  });

  describe("thumbhash vs blurhash comparison", () => {
    it("should produce smaller or similar sized hash", async () => {
      const result = await thumbhash(testImageJpeg);

      // ThumbHash is typically ~25 bytes
      // BlurHash (4x3) is typically ~28 characters base83
      expect(result.hash.length).toBeLessThanOrEqual(30);
    });

    it("should preserve aspect ratio information", async () => {
      // ThumbHash encodes aspect ratio in the hash itself
      const result = await thumbhash(testImageJpeg);
      const decoded = await thumbhashToRgba(result.hash);

      // The decoded placeholder should have a similar aspect ratio
      const originalRatio = 200 / 150; // 1.333...
      const decodedRatio = decoded.width / decoded.height;

      // Allow some tolerance since ThumbHash approximates aspect ratio
      expect(Math.abs(originalRatio - decodedRatio)).toBeLessThan(0.5);
    });
  });

  describe("error handling", () => {
    it("should throw on invalid image data", async () => {
      const invalidData = Buffer.from("not an image");

      await expect(thumbhash(invalidData)).rejects.toThrow();
    });

    it("should throw on invalid thumbhash data", async () => {
      const invalidHash = Buffer.from([0, 1, 2]); // Too short

      await expect(thumbhashToRgba(invalidHash)).rejects.toThrow();
    });
  });
});
