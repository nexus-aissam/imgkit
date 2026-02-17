/**
 * Crop API functions
 */

import { native } from "../loader";
import { toNapiCropOptions } from "../converters";
import type { CropOptions, AsyncOptions } from "../types";
import { withAbortSignal } from "../abort";

/**
 * Crop an image asynchronously
 *
 * @param input - Image buffer
 * @param options - Crop options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Cropped image as PNG buffer
 *
 * @example
 * ```typescript
 * const cropped = await crop(input, { x: 100, y: 50, width: 800, height: 600 });
 *
 * // With timeout
 * const cropped = await crop(input, { aspectRatio: "1:1" }, { timeoutMs: 5000 });
 * ```
 */
export async function crop(
  input: Buffer,
  options: CropOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.crop(input, toNapiCropOptions(options), asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Crop an image synchronously
 */
export function cropSync(input: Buffer, options: CropOptions): Buffer {
  return native.cropSync(input, toNapiCropOptions(options));
}
