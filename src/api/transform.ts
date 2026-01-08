/**
 * Transform API functions
 */

import type { TransformOptions } from "../types";
import { native } from "../loader";
import { toNapiTransformOptions } from "../converters";

/**
 * Transform image with multiple operations asynchronously
 *
 * This is the most efficient way to apply multiple transformations
 * as it processes the image only once.
 *
 * @param input - Image buffer
 * @param options - Transform options
 * @returns Promise resolving to transformed image buffer
 *
 * @example
 * ```typescript
 * const result = await transform(imageBuffer, {
 *   resize: { width: 800, height: 600 },
 *   rotate: 90,
 *   grayscale: true,
 *   output: { format: 'webp', webp: { quality: 85 } }
 * });
 * ```
 */
export async function transform(
  input: Buffer,
  options: TransformOptions
): Promise<Buffer> {
  return native.transform(input, toNapiTransformOptions(options));
}

/**
 * Transform image with multiple operations synchronously
 */
export function transformSync(
  input: Buffer,
  options: TransformOptions
): Buffer {
  return native.transformSync(input, toNapiTransformOptions(options));
}
