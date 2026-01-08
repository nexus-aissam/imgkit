/**
 * Blurhash API functions
 */

import type { BlurHashResult } from "../types";
import { native } from "../loader";

/**
 * Generate blurhash from image asynchronously
 *
 * Blurhash is a compact representation of a placeholder for an image.
 *
 * @param input - Image buffer
 * @param componentsX - Number of X components (default: 4)
 * @param componentsY - Number of Y components (default: 3)
 * @returns Promise resolving to blurhash result
 *
 * @example
 * ```typescript
 * const { hash, width, height } = await blurhash(imageBuffer);
 * console.log(hash); // "LEHV6nWB2yk8pyo0adR*.7kCMdnj"
 * ```
 */
export async function blurhash(
  input: Buffer,
  componentsX?: number,
  componentsY?: number
): Promise<BlurHashResult> {
  return native.blurhash(input, componentsX, componentsY);
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
