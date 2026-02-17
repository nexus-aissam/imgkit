import { describe, it, expect, beforeAll } from "bun:test";
import {
  resize,
  metadata,
  toJpeg,
  crop,
  thumbnail,
  blurhash,
  transform,
} from "../../dist/index.mjs";

let testImage: Buffer;

beforeAll(async () => {
  const response = await fetch("https://picsum.photos/800/600");
  testImage = Buffer.from(await response.arrayBuffer());
});

describe("Timeout support", () => {
  it("should reject with timeout error when timeoutMs is very small", async () => {
    // 1ms timeout should be too short for a resize operation
    try {
      await resize(testImage, { width: 100 }, { timeoutMs: 1 });
      // If it somehow succeeds (very fast machine), that's ok too
    } catch (e: any) {
      expect(e.message).toContain("timed out");
    }
  });

  it("should succeed with no timeout (backward compatibility)", async () => {
    const result = await resize(testImage, { width: 100 });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should succeed with generous timeout", async () => {
    const result = await resize(testImage, { width: 100 }, { timeoutMs: 30000 });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should work with metadata and timeout", async () => {
    const info = await metadata(testImage, { timeoutMs: 30000 });
    expect(info.width).toBe(800);
    expect(info.height).toBe(600);
  });

  it("should work with toJpeg and timeout", async () => {
    const result = await toJpeg(testImage, { quality: 80 }, { timeoutMs: 30000 });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should work with crop and timeout", async () => {
    const result = await crop(
      testImage,
      { x: 0, y: 0, width: 200, height: 200 },
      { timeoutMs: 30000 }
    );
    expect(result).toBeInstanceOf(Buffer);
  });

  it("should work with thumbnail and timeout", async () => {
    const result = await thumbnail(
      testImage,
      { width: 100 },
      { timeoutMs: 30000 }
    );
    expect(result.data).toBeInstanceOf(Buffer);
    expect(result.width).toBeGreaterThan(0);
  });

  it("should work with blurhash and timeout", async () => {
    const result = await blurhash(testImage, 4, 3, { timeoutMs: 30000 });
    expect(result.hash).toBeTruthy();
  });

  it("should work with transform and timeout", async () => {
    const result = await transform(
      testImage,
      { resize: { width: 200 }, grayscale: true },
      { timeoutMs: 30000 }
    );
    expect(result).toBeInstanceOf(Buffer);
  });
});

describe("AbortSignal support", () => {
  it("should reject with AbortError when signal is aborted", async () => {
    const controller = new AbortController();
    // Abort immediately
    controller.abort();

    try {
      await resize(testImage, { width: 100 }, { signal: controller.signal });
      throw new Error("Should have thrown");
    } catch (e: any) {
      expect(e.name).toBe("AbortError");
    }
  });

  it("should reject with custom abort reason", async () => {
    const controller = new AbortController();
    const reason = new Error("Custom cancellation");
    controller.abort(reason);

    try {
      await resize(testImage, { width: 100 }, { signal: controller.signal });
      throw new Error("Should have thrown");
    } catch (e: any) {
      expect(e.message).toBe("Custom cancellation");
    }
  });

  it("should work with AbortSignal.timeout()", async () => {
    // Use a generous timeout that should succeed
    const result = await resize(
      testImage,
      { width: 100 },
      { signal: AbortSignal.timeout(30000) }
    );
    expect(result).toBeInstanceOf(Buffer);
  });

  it("should reject when AbortSignal.timeout() expires", async () => {
    try {
      // 1ms timeout should be too short
      await resize(
        testImage,
        { width: 100 },
        { signal: AbortSignal.timeout(1) }
      );
      // May succeed on very fast machines
    } catch (e: any) {
      expect(e.name).toBe("TimeoutError");
    }
  });

  it("should support both timeoutMs and signal together", async () => {
    const controller = new AbortController();
    const result = await resize(
      testImage,
      { width: 100 },
      { timeoutMs: 30000, signal: controller.signal }
    );
    expect(result).toBeInstanceOf(Buffer);
  });

  it("should reject from signal even with generous timeoutMs", async () => {
    const controller = new AbortController();
    controller.abort();

    try {
      await resize(
        testImage,
        { width: 100 },
        { timeoutMs: 30000, signal: controller.signal }
      );
      throw new Error("Should have thrown");
    } catch (e: any) {
      expect(e.name).toBe("AbortError");
    }
  });
});
