/**
 * Metadata API functions
 */

import type { ImageMetadata } from "../types";
import { native } from "../loader";

/**
 * Get image metadata asynchronously
 *
 * @param input - Image buffer
 * @returns Promise resolving to image metadata
 *
 * @example
 * ```typescript
 * const info = await metadata(imageBuffer);
 * console.log(`${info.width}x${info.height} ${info.format}`);
 * ```
 */
export async function metadata(input: Buffer): Promise<ImageMetadata> {
  return native.metadata(input);
}

/**
 * Get image metadata synchronously
 */
export function metadataSync(input: Buffer): ImageMetadata {
  return native.metadataSync(input);
}
