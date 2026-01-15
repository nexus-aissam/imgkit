/**
 * Perceptual Hash Tests
 *
 * Tests for image similarity detection using pHash, dHash, aHash algorithms.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  imageHash,
  imageHashSync,
  imageHashDistance,
  imageHashDistanceSync,
} from "../../dist";

// Test images
let testImageJpeg: Buffer;
let testImageJpeg2: Buffer;

beforeAll(async () => {
  // Download test images (use seed for consistent images)
  const jpegResponse = await fetch("https://picsum.photos/seed/test1/800/600.jpg");
  testImageJpeg = Buffer.from(await jpegResponse.arrayBuffer());

  // Second different image for comparison tests
  const jpegResponse2 = await fetch("https://picsum.photos/seed/test2/800/600.jpg");
  testImageJpeg2 = Buffer.from(await jpegResponse2.arrayBuffer());
});

describe("imageHash", () => {
  describe("hash generation", () => {
    it("should generate perceptual hash from JPEG (async)", async () => {
      const result = await imageHash(testImageJpeg);

      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe("string");
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.hashSize).toBe(8);
      expect(result.algorithm).toBe("PHash");
    });

    it("should generate perceptual hash from JPEG (sync)", () => {
      const result = imageHashSync(testImageJpeg);

      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe("string");
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.algorithm).toBe("PHash");
    });

    it("should generate perceptual hash from different image (async)", async () => {
      const result = await imageHash(testImageJpeg2);

      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe("string");
    });

    it("should generate perceptual hash from different image (sync)", () => {
      const result = imageHashSync(testImageJpeg2);

      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
    });
  });

  describe("algorithms", () => {
    it("should generate PHash (default)", async () => {
      const result = await imageHash(testImageJpeg, { algorithm: "PHash" });
      expect(result.algorithm).toBe("PHash");
    });

    it("should generate DHash", async () => {
      const result = await imageHash(testImageJpeg, { algorithm: "DHash" });
      expect(result.algorithm).toBe("DHash");
    });

    it("should generate AHash", async () => {
      const result = await imageHash(testImageJpeg, { algorithm: "AHash" });
      expect(result.algorithm).toBe("AHash");
    });

    it("should generate BlockHash", async () => {
      const result = await imageHash(testImageJpeg, { algorithm: "BlockHash" });
      expect(result.algorithm).toBe("BlockHash");
    });

    it("should generate different hashes for different algorithms", async () => {
      const pHash = await imageHash(testImageJpeg, { algorithm: "PHash" });
      const dHash = await imageHash(testImageJpeg, { algorithm: "DHash" });
      const aHash = await imageHash(testImageJpeg, { algorithm: "AHash" });

      // Different algorithms produce different hashes
      expect(pHash.hash).not.toBe(dHash.hash);
      expect(pHash.hash).not.toBe(aHash.hash);
      expect(dHash.hash).not.toBe(aHash.hash);
    });
  });

  describe("hash sizes", () => {
    it("should generate 8x8 hash (default)", async () => {
      const result = await imageHash(testImageJpeg, { size: "Size8" });
      expect(result.hashSize).toBe(8);
    });

    it("should generate 16x16 hash", async () => {
      const result = await imageHash(testImageJpeg, { size: "Size16" });
      expect(result.hashSize).toBe(16);
    });

    it("should generate 32x32 hash", async () => {
      const result = await imageHash(testImageJpeg, { size: "Size32" });
      expect(result.hashSize).toBe(32);
    });

    it("should generate different length hashes for different sizes", async () => {
      const hash8 = await imageHash(testImageJpeg, { size: "Size8" });
      const hash16 = await imageHash(testImageJpeg, { size: "Size16" });
      const hash32 = await imageHash(testImageJpeg, { size: "Size32" });

      // Larger sizes produce longer base64 strings
      expect(hash8.hash.length).toBeLessThan(hash16.hash.length);
      expect(hash16.hash.length).toBeLessThan(hash32.hash.length);
    });
  });

  describe("consistency", () => {
    it("should generate identical hash for same image (async)", async () => {
      const hash1 = await imageHash(testImageJpeg);
      const hash2 = await imageHash(testImageJpeg);

      expect(hash1.hash).toBe(hash2.hash);
    });

    it("should generate identical hash for same image (sync)", () => {
      const hash1 = imageHashSync(testImageJpeg);
      const hash2 = imageHashSync(testImageJpeg);

      expect(hash1.hash).toBe(hash2.hash);
    });

    it("should generate identical hash for async and sync", async () => {
      const asyncHash = await imageHash(testImageJpeg);
      const syncHash = imageHashSync(testImageJpeg);

      expect(asyncHash.hash).toBe(syncHash.hash);
    });
  });

  describe("error handling", () => {
    it("should throw on invalid image data", async () => {
      const invalidData = Buffer.from("not an image");
      await expect(imageHash(invalidData)).rejects.toThrow();
    });

    it("should throw on empty buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(imageHash(emptyBuffer)).rejects.toThrow();
    });
  });
});

describe("imageHashDistance", () => {
  describe("distance calculation", () => {
    it("should return 0 for identical hashes (async)", async () => {
      const hash = await imageHash(testImageJpeg);
      const distance = await imageHashDistance(hash.hash, hash.hash);

      expect(distance).toBe(0);
    });

    it("should return 0 for identical hashes (sync)", () => {
      const hash = imageHashSync(testImageJpeg);
      const distance = imageHashDistanceSync(hash.hash, hash.hash);

      expect(distance).toBe(0);
    });

    it("should return non-zero for different images", async () => {
      const hash1 = await imageHash(testImageJpeg);
      const hash2 = await imageHash(testImageJpeg2);
      const distance = await imageHashDistance(hash1.hash, hash2.hash);

      // Different images should have some distance
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    it("should work with sync function", () => {
      const hash1 = imageHashSync(testImageJpeg);
      const hash2 = imageHashSync(testImageJpeg2);
      const distance = imageHashDistanceSync(hash1.hash, hash2.hash);

      expect(typeof distance).toBe("number");
      expect(distance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error handling", () => {
    it("should throw on invalid hash1", async () => {
      const validHash = await imageHash(testImageJpeg);
      await expect(
        imageHashDistance("invalid", validHash.hash)
      ).rejects.toThrow();
    });

    it("should throw on invalid hash2", async () => {
      const validHash = await imageHash(testImageJpeg);
      await expect(
        imageHashDistance(validHash.hash, "invalid")
      ).rejects.toThrow();
    });
  });
});
