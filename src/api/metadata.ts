/**
 * Metadata API functions
 */

import type { ImageMetadata, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Get image metadata asynchronously
 *
 * @param input - Image buffer
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to image metadata
 *
 * @example
 * ```typescript
 * const info = await metadata(imageBuffer);
 * console.log(`${info.width}x${info.height} ${info.format}`);
 *
 * // With timeout
 * const info = await metadata(imageBuffer, { timeoutMs: 5000 });
 *
 * // With AbortSignal
 * const controller = new AbortController();
 * const info = await metadata(imageBuffer, { signal: controller.signal });
 * ```
 */
export async function metadata(
  input: Buffer,
  asyncOptions?: AsyncOptions
): Promise<ImageMetadata> {
  return withAbortSignal(
    native.metadata(input, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Get image metadata synchronously
 */
export function metadataSync(input: Buffer): ImageMetadata {
  return native.metadataSync(input);
}
