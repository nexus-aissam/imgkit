/**
 * EXIF metadata API functions
 */

import type { ExifOptions, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Write EXIF metadata to an image asynchronously
 *
 * Supports JPEG and WebP formats.
 *
 * @param input - Image buffer
 * @param options - EXIF metadata options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to image buffer with EXIF data
 */
export async function writeExif(
  input: Buffer,
  options: ExifOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.writeExif(input, options, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Write EXIF metadata to an image synchronously
 */
export function writeExifSync(input: Buffer, options: ExifOptions): Buffer {
  return native.writeExifSync(input, options);
}

/**
 * Strip all EXIF metadata from an image asynchronously
 *
 * Supports JPEG and WebP formats.
 *
 * @param input - Image buffer
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to image buffer without EXIF data
 */
export async function stripExif(
  input: Buffer,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.stripExif(input, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Strip all EXIF metadata from an image synchronously
 */
export function stripExifSync(input: Buffer): Buffer {
  return native.stripExifSync(input);
}
