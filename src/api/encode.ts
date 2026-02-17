/**
 * Image encoding/format conversion API functions
 */

import type { JpegOptions, PngOptions, WebPOptions, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Convert image to JPEG asynchronously
 *
 * @param input - Image buffer
 * @param options - JPEG encoding options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to JPEG buffer
 *
 * @example
 * ```typescript
 * const jpeg = await toJpeg(imageBuffer, { quality: 85 });
 *
 * // With timeout
 * const jpeg = await toJpeg(imageBuffer, { quality: 85 }, { timeoutMs: 5000 });
 * ```
 */
export async function toJpeg(
  input: Buffer,
  options?: JpegOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.toJpeg(input, options, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
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
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to PNG buffer
 */
export async function toPng(
  input: Buffer,
  options?: PngOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.toPng(input, options, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
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
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to WebP buffer
 */
export async function toWebp(
  input: Buffer,
  options?: WebPOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.toWebp(input, options, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Convert image to WebP synchronously
 */
export function toWebpSync(input: Buffer, options?: WebPOptions): Buffer {
  return native.toWebpSync(input, options);
}
