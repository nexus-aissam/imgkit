/**
 * Transform API functions
 */

import type { TransformOptions, AsyncOptions } from "../types";
import { native } from "../loader";
import { toNapiTransformOptions } from "../converters";
import { withAbortSignal } from "../abort";

/**
 * Transform image with multiple operations asynchronously
 *
 * @param input - Image buffer
 * @param options - Transform options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to transformed image buffer
 *
 * @example
 * ```typescript
 * const result = await transform(imageBuffer, {
 *   resize: { width: 800, height: 600 },
 *   rotate: 90,
 *   grayscale: true,
 *   output: { format: 'webp', webp: { quality: 85 } }
 * }, { timeoutMs: 10000 });
 * ```
 */
export async function transform(
  input: Buffer,
  options: TransformOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.transform(input, toNapiTransformOptions(options), asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
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
