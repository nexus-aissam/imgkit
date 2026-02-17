/**
 * Resize API functions
 */

import type { ResizeOptions, AsyncOptions } from "../types";
import { native } from "../loader";
import { toNapiResizeOptions } from "../converters";
import { withAbortSignal } from "../abort";

/**
 * Resize image asynchronously
 *
 * @param input - Image buffer
 * @param options - Resize options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to resized image buffer (PNG)
 *
 * @example
 * ```typescript
 * // Resize to specific dimensions
 * const resized = await resize(imageBuffer, { width: 800, height: 600 });
 *
 * // With timeout
 * const resized = await resize(imageBuffer, { width: 800 }, { timeoutMs: 5000 });
 * ```
 */
export async function resize(
  input: Buffer,
  options: ResizeOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.resize(input, toNapiResizeOptions(options), asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Resize image synchronously
 */
export function resizeSync(input: Buffer, options: ResizeOptions): Buffer {
  return native.resizeSync(input, toNapiResizeOptions(options));
}
