/**
 * Blurhash API functions
 */

import type { BlurHashResult, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Generate blurhash from image asynchronously
 *
 * @param input - Image buffer
 * @param componentsX - Number of X components (default: 4)
 * @param componentsY - Number of Y components (default: 3)
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to blurhash result
 *
 * @example
 * ```typescript
 * const { hash, width, height } = await blurhash(imageBuffer);
 *
 * // With timeout
 * const { hash } = await blurhash(imageBuffer, 4, 3, { timeoutMs: 5000 });
 * ```
 */
export async function blurhash(
  input: Buffer,
  componentsX?: number,
  componentsY?: number,
  asyncOptions?: AsyncOptions
): Promise<BlurHashResult> {
  return withAbortSignal(
    native.blurhash(input, componentsX, componentsY, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Generate blurhash from image synchronously
 */
export function blurhashSync(
  input: Buffer,
  componentsX?: number,
  componentsY?: number
): BlurHashResult {
  return native.blurhashSync(input, componentsX, componentsY);
}
