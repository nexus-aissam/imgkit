/**
 * ThumbHash API functions
 *
 * ThumbHash is a compact image placeholder that produces smoother,
 * more visually pleasing placeholders compared to BlurHash.
 */

import type { ThumbHashResult, ThumbHashDecodeResult, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Convert thumbhash RGBA to PNG data URL
 */
function rgbaToDataUrl(rgba: Buffer, width: number, height: number): string {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = rgba[srcIdx];
      rawData[dstIdx + 1] = rgba[srcIdx + 1];
      rawData[dstIdx + 2] = rgba[srcIdx + 2];
      rawData[dstIdx + 3] = rgba[srcIdx + 3];
    }
  }

  const zlib = require("zlib");
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const chunks: Buffer[] = [signature];
  chunks.push(createChunk("IHDR", ihdr));
  chunks.push(createChunk("IDAT", compressed));
  chunks.push(createChunk("IEND", Buffer.alloc(0)));

  const png = Buffer.concat(chunks);
  return `data:image/png;base64,${png.toString("base64")}`;
}

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
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to thumbhash result with data URL
 *
 * @example
 * ```typescript
 * const { hash, dataUrl } = await thumbhash(imageBuffer);
 *
 * // With timeout
 * const { hash } = await thumbhash(imageBuffer, { timeoutMs: 5000 });
 * ```
 */
export async function thumbhash(
  input: Buffer,
  asyncOptions?: AsyncOptions
): Promise<ThumbHashResult> {
  const result = await withAbortSignal<{ hash: number[]; width: number; height: number; hasAlpha: boolean }>(
    native.thumbhash(input, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );

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
 * @param hash - ThumbHash bytes
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to RGBA pixels and dimensions
 */
export async function thumbhashToRgba(
  hash: Buffer,
  asyncOptions?: AsyncOptions
): Promise<ThumbHashDecodeResult> {
  const result = await withAbortSignal<{ rgba: number[]; width: number; height: number }>(
    native.thumbhashToRgba(hash, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
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
 * @param hash - ThumbHash bytes
 * @returns Base64 data URL string
 */
export function thumbhashToDataUrl(hash: Buffer): string {
  const { rgba, width, height } = thumbhashToRgbaSync(hash);
  return rgbaToDataUrl(rgba, width, height);
}
