/**
 * Crop API functions
 *
 * Zero-copy image cropping with multiple modes:
 * - Explicit coordinates (x, y, width, height)
 * - Aspect ratio with gravity anchor
 * - Dimensions with gravity anchor
 */

import { native } from "../loader";
import { toNapiCropOptions } from "../converters";
import type { CropOptions } from "../types";

/**
 * Crop an image asynchronously
 *
 * Supports three cropping modes:
 * 1. Explicit coordinates: { x, y, width, height }
 * 2. Aspect ratio: { aspectRatio: "16:9", gravity: "center" }
 * 3. Dimensions with gravity: { width, height, gravity: "north" }
 *
 * @param input - Image buffer
 * @param options - Crop options
 * @returns Cropped image as PNG buffer
 *
 * @example
 * ```typescript
 * // Crop specific region
 * const cropped = await crop(input, { x: 100, y: 50, width: 800, height: 600 });
 *
 * // Crop to aspect ratio (centered)
 * const square = await crop(input, { aspectRatio: "1:1" });
 *
 * // Crop to aspect ratio (top-aligned)
 * const banner = await crop(input, { aspectRatio: "16:9", gravity: "north" });
 *
 * // Crop to dimensions (centered)
 * const thumb = await crop(input, { width: 200, height: 200 });
 * ```
 */
export async function crop(
  input: Buffer,
  options: CropOptions
): Promise<Buffer> {
  return native.crop(input, toNapiCropOptions(options));
}

/**
 * Crop an image synchronously
 *
 * @param input - Image buffer
 * @param options - Crop options
 * @returns Cropped image as PNG buffer
 */
export function cropSync(input: Buffer, options: CropOptions): Buffer {
  return native.cropSync(input, toNapiCropOptions(options));
}
