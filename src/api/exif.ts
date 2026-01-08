/**
 * EXIF metadata API functions
 */

import type { ExifOptions } from "../types";
import { native } from "../loader";

/**
 * Write EXIF metadata to an image asynchronously
 *
 * Supports JPEG and WebP formats.
 *
 * @param input - Image buffer
 * @param options - EXIF metadata options
 * @returns Promise resolving to image buffer with EXIF data
 *
 * @example
 * ```typescript
 * const withExif = await writeExif(imageBuffer, {
 *   imageDescription: 'A beautiful sunset over the ocean',
 *   artist: 'John Doe',
 *   software: 'My AI App v1.0',
 *   userComment: JSON.stringify({ model: 'stable-diffusion', seed: 12345 })
 * });
 * ```
 */
export async function writeExif(
  input: Buffer,
  options: ExifOptions
): Promise<Buffer> {
  return native.writeExif(input, options);
}

/**
 * Write EXIF metadata to an image synchronously
 *
 * Supports JPEG and WebP formats.
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
 * @returns Promise resolving to image buffer without EXIF data
 *
 * @example
 * ```typescript
 * const stripped = await stripExif(imageBuffer);
 * ```
 */
export async function stripExif(input: Buffer): Promise<Buffer> {
  return native.stripExif(input);
}

/**
 * Strip all EXIF metadata from an image synchronously
 *
 * Supports JPEG and WebP formats.
 */
export function stripExifSync(input: Buffer): Buffer {
  return native.stripExifSync(input);
}
