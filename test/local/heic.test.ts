import { describe, it, expect, beforeAll } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";
import { metadata, toJpeg, toWebp, toPng, transform } from "../../dist/index.mjs";

const heicPath = join(import.meta.dir, "..", "examples", "image.heic");
let heicImage: Buffer | null = null;
let heicSupported = false;

beforeAll(async () => {
  // Check if HEIC test file exists
  if (existsSync(heicPath)) {
    heicImage = Buffer.from(await Bun.file(heicPath).arrayBuffer());

    // Test if HEIC is supported on this platform
    try {
      await metadata(heicImage);
      heicSupported = true;
    } catch (e) {
      heicSupported = false;
    }
  }
});

describe("HEIC Support", () => {
  it("should detect HEIC file", async () => {
    if (!heicImage) {
      console.log("Skipping: No HEIC test file found");
      return;
    }
    if (!heicSupported) {
      console.log("Skipping: HEIC not supported on this platform");
      return;
    }

    const meta = await metadata(heicImage);
    expect(meta.format).toBe("heic");
  });

  it("should get HEIC metadata", async () => {
    if (!heicImage || !heicSupported) return;

    const meta = await metadata(heicImage);

    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
    expect(meta.format).toBe("heic");
    expect(meta.channels).toBeGreaterThan(0);
  });

  it("should convert HEIC to JPEG", async () => {
    if (!heicImage || !heicSupported) return;

    const jpeg = await toJpeg(heicImage, { quality: 85 });
    const meta = await metadata(jpeg);

    expect(meta.format).toBe("jpeg");
    expect(jpeg.length).toBeGreaterThan(0);
  });

  it("should convert HEIC to WebP", async () => {
    if (!heicImage || !heicSupported) return;

    const webp = await toWebp(heicImage, { quality: 80 });
    const meta = await metadata(webp);

    expect(meta.format).toBe("webp");
    expect(webp.length).toBeGreaterThan(0);
  });

  it("should convert HEIC to PNG", async () => {
    if (!heicImage || !heicSupported) return;

    const png = await toPng(heicImage);
    const meta = await metadata(png);

    expect(meta.format).toBe("png");
    expect(png.length).toBeGreaterThan(0);
  });

  it("should resize HEIC and convert", async () => {
    if (!heicImage || !heicSupported) return;

    const result = await transform(heicImage, {
      resize: { width: 800, height: 600 },
      output: { format: "jpeg", jpeg: { quality: 80 } },
    });

    const meta = await metadata(result);

    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
    expect(meta.format).toBe("jpeg");
  });

  it("should create thumbnail from HEIC", async () => {
    if (!heicImage || !heicSupported) return;

    const thumb = await transform(heicImage, {
      resize: { width: 150, height: 150, fit: "cover" },
      output: { format: "webp", webp: { quality: 70 } },
    });

    const meta = await metadata(thumb);

    expect(meta.width).toBe(150);
    expect(meta.height).toBe(150);
    expect(meta.format).toBe("webp");
  });
});
