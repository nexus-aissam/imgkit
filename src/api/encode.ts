/**
 * Image encoding/format conversion API functions
 */

import type { JpegOptions, PngOptions, WebPOptions } from "../types";
import { native } from "../loader";

/**
 * Convert image to JPEG asynchronously
 *
 * @param input - Image buffer
 * @param options - JPEG encoding options
 * @returns Promise resolving to JPEG buffer
 *
 * @example
 * ```typescript
 * const jpeg = await toJpeg(imageBuffer, { quality: 85 });
 * ```
 */
export async function toJpeg(
  input: Buffer,
  options?: JpegOptions
): Promise<Buffer> {
  return native.toJpeg(input, options);
}

/**
 * Convert image to JPEG synchronously
 */
export function toJpegSync(input: Buffer, options?: JpegOptions): Buffer {
  return native.toJpegSync(input, options);
}

/**
 * Convert image to PNG asynchronously
 *
 * @param input - Image buffer
 * @param options - PNG encoding options
 * @returns Promise resolving to PNG buffer
 *
 * @example
 * ```typescript
 * const png = await toPng(imageBuffer, { compression: 9 });
 * ```
 */
export async function toPng(
  input: Buffer,
  options?: PngOptions
): Promise<Buffer> {
  return native.toPng(input, options);
}

/**
 * Convert image to PNG synchronously
 */
export function toPngSync(input: Buffer, options?: PngOptions): Buffer {
  return native.toPngSync(input, options);
}

/**
 * Convert image to WebP asynchronously
 *
 * @param input - Image buffer
 * @param options - WebP encoding options
 * @returns Promise resolving to WebP buffer
 *
 * @example
 * ```typescript
 * // Lossy WebP
 * const webp = await toWebp(imageBuffer, { quality: 80 });
 *
 * // Lossless WebP
 * const lossless = await toWebp(imageBuffer, { lossless: true });
 * ```
 */
export async function toWebp(
  input: Buffer,
  options?: WebPOptions
): Promise<Buffer> {
  return native.toWebp(input, options);
}

/**
 * Convert image to WebP synchronously
 */
export function toWebpSync(input: Buffer, options?: WebPOptions): Buffer {
  return native.toWebpSync(input, options);
}
