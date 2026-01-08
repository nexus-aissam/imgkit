/**
 * Resize API functions
 */

import type { ResizeOptions } from "../types";
import { native } from "../loader";
import { toNapiResizeOptions } from "../converters";

/**
 * Resize image asynchronously
 *
 * @param input - Image buffer
 * @param options - Resize options
 * @returns Promise resolving to resized image buffer (PNG)
 *
 * @example
 * ```typescript
 * // Resize to specific dimensions
 * const resized = await resize(imageBuffer, { width: 800, height: 600 });
 *
 * // Resize maintaining aspect ratio
 * const thumb = await resize(imageBuffer, { width: 200 });
 *
 * // High-quality resize
 * const hq = await resize(imageBuffer, {
 *   width: 1920,
 *   filter: 'lanczos3',
 *   fit: 'contain'
 * });
 * ```
 */
export async function resize(
  input: Buffer,
  options: ResizeOptions
): Promise<Buffer> {
  return native.resize(input, toNapiResizeOptions(options));
}

/**
 * Resize image synchronously
 */
export function resizeSync(input: Buffer, options: ResizeOptions): Buffer {
  return native.resizeSync(input, toNapiResizeOptions(options));
}
