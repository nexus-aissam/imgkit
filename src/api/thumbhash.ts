/**
 * ThumbHash API functions
 *
 * ThumbHash is a compact image placeholder that produces smoother,
 * more visually pleasing placeholders compared to BlurHash.
 *
 * Features:
 * - Alpha channel support (transparency)
 * - Aspect ratio preservation (encoded in hash)
 * - Better color accuracy
 * - Smoother gradients
 */

import type { ThumbHashResult, ThumbHashDecodeResult } from "../types";
import { native } from "../loader";

/**
 * Convert thumbhash RGBA to PNG data URL
 * Used internally to generate the dataUrl field
 */
function rgbaToDataUrl(rgba: Buffer, width: number, height: number): string {
  // Create PNG manually (simple implementation)
  // PNG signature + IHDR + IDAT + IEND

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type (RGBA)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Create raw image data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter byte (none)
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = rgba[srcIdx]; // R
      rawData[dstIdx + 1] = rgba[srcIdx + 1]; // G
      rawData[dstIdx + 2] = rgba[srcIdx + 2]; // B
      rawData[dstIdx + 3] = rgba[srcIdx + 3]; // A
    }
  }

  // Use zlib for compression
  const zlib = require("zlib");
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  // Build chunks
  const chunks: Buffer[] = [signature];

  // IHDR chunk
  chunks.push(createChunk("IHDR", ihdr));

  // IDAT chunk
  chunks.push(createChunk("IDAT", compressed));

  // IEND chunk
  chunks.push(createChunk("IEND", Buffer.alloc(0)));

  const png = Buffer.concat(chunks);
  return `data:image/png;base64,${png.toString("base64")}`;
}

/**
 * Create a PNG chunk with CRC
 */
function createChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBytes, data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBytes, data, crcBuf]);
}

/**
 * CRC32 implementation for PNG
 */
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

let crcTable: Uint32Array | null = null;
function getCrc32Table(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  return crcTable;
}

/**
 * Generate thumbhash from image asynchronously
 *
 * ThumbHash produces smoother, more visually pleasing placeholders compared to BlurHash.
 * It also preserves aspect ratio and supports alpha channel.
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @returns Promise resolving to thumbhash result with data URL
 *
 * @example
 * ```typescript
 * const { hash, dataUrl, width, height, hasAlpha } = await thumbhash(imageBuffer);
 *
 * // Use dataUrl directly in CSS or HTML
 * element.style.backgroundImage = `url(${dataUrl})`;
 *
 * // Or store the compact hash (~25 bytes) for later
 * await db.insert({ thumbhash: hash });
 * ```
 */
export async function thumbhash(input: Buffer): Promise<ThumbHashResult> {
  const result = await native.thumbhash(input);

  // Decode to get RGBA for data URL generation
  const decoded = await native.thumbhashToRgba(Buffer.from(result.hash));
  const dataUrl = rgbaToDataUrl(
    Buffer.from(decoded.rgba),
    decoded.width,
    decoded.height
  );

  return {
    hash: Buffer.from(result.hash),
    dataUrl,
    width: result.width,
    height: result.height,
    hasAlpha: result.hasAlpha,
  };
}

/**
 * Generate thumbhash from image synchronously
 */
export function thumbhashSync(input: Buffer): ThumbHashResult {
  const result = native.thumbhashSync(input);

  // Decode to get RGBA for data URL generation
  const decoded = native.thumbhashToRgbaSync(Buffer.from(result.hash));
  const dataUrl = rgbaToDataUrl(
    Buffer.from(decoded.rgba),
    decoded.width,
    decoded.height
  );

  return {
    hash: Buffer.from(result.hash),
    dataUrl,
    width: result.width,
    height: result.height,
    hasAlpha: result.hasAlpha,
  };
}

/**
 * Decode thumbhash back to RGBA pixels asynchronously
 *
 * Useful for rendering the placeholder at a custom size or manipulating the pixels.
 *
 * @param hash - ThumbHash bytes
 * @returns Promise resolving to RGBA pixels and dimensions
 *
 * @example
 * ```typescript
 * const { rgba, width, height } = await thumbhashToRgba(hash);
 * // rgba is a Buffer of width * height * 4 bytes (RGBA)
 * ```
 */
export async function thumbhashToRgba(
  hash: Buffer
): Promise<ThumbHashDecodeResult> {
  const result = await native.thumbhashToRgba(hash);
  return {
    rgba: Buffer.from(result.rgba),
    width: result.width,
    height: result.height,
  };
}

/**
 * Decode thumbhash back to RGBA pixels synchronously
 */
export function thumbhashToRgbaSync(hash: Buffer): ThumbHashDecodeResult {
  const result = native.thumbhashToRgbaSync(hash);
  return {
    rgba: Buffer.from(result.rgba),
    width: result.width,
    height: result.height,
  };
}

/**
 * Convert thumbhash to data URL (helper function)
 *
 * Generates a base64-encoded PNG data URL from a thumbhash.
 * Useful when you have stored the hash and need to render it.
 *
 * @param hash - ThumbHash bytes
 * @returns Base64 data URL string
 *
 * @example
 * ```typescript
 * const dataUrl = thumbhashToDataUrl(storedHash);
 * img.src = dataUrl;
 * ```
 */
export function thumbhashToDataUrl(hash: Buffer): string {
  const { rgba, width, height } = thumbhashToRgbaSync(hash);
  return rgbaToDataUrl(rgba, width, height);
}
