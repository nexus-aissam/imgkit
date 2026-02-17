/**
 * Perceptual hashing API for image similarity detection
 */

import type { ImageHashOptions, ImageHashResult, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Generate a perceptual hash from an image asynchronously
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Hash options (algorithm, size)
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to ImageHashResult with hash string
 *
 * @example
 * ```typescript
 * const result = await imageHash(buffer);
 *
 * // With timeout
 * const result = await imageHash(buffer, { algorithm: 'PHash' }, { timeoutMs: 5000 });
 * ```
 */
export async function imageHash(
  input: Buffer,
  options?: ImageHashOptions,
  asyncOptions?: AsyncOptions
): Promise<ImageHashResult> {
  const result = await withAbortSignal<ImageHashResult>(
    native.imageHash(input, options?.algorithm, options?.size, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
  return {
    hash: result.hash,
    width: result.width,
    height: result.height,
    hashSize: result.hashSize,
    algorithm: result.algorithm,
  };
}

/**
 * Generate a perceptual hash from an image synchronously
 */
export function imageHashSync(
  input: Buffer,
  options?: ImageHashOptions
): ImageHashResult {
  const result = native.imageHashSync(input, options?.algorithm, options?.size);
  return {
    hash: result.hash,
    width: result.width,
    height: result.height,
    hashSize: result.hashSize,
    algorithm: result.algorithm,
  };
}

/**
 * Calculate the hamming distance between two perceptual hashes asynchronously
 *
 * @param hash1 - First hash (base64 string from imageHash)
 * @param hash2 - Second hash (base64 string from imageHash)
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to hamming distance
 */
export async function imageHashDistance(
  hash1: string,
  hash2: string,
  asyncOptions?: AsyncOptions
): Promise<number> {
  return withAbortSignal(
    native.imageHashDistance(hash1, hash2, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Calculate the hamming distance between two perceptual hashes synchronously
 */
export function imageHashDistanceSync(hash1: string, hash2: string): number {
  return native.imageHashDistanceSync(hash1, hash2);
}
