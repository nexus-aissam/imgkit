/**
 * Fast Thumbnail API
 *
 * Optimized thumbnail generation with shrink-on-load support.
 */

import { native } from "../loader";
import type { ThumbnailOptions, ThumbnailResult, AsyncOptions } from "../types";
import { withAbortSignal } from "../abort";

/**
 * Generate a fast thumbnail synchronously
 */
export function thumbnailSync(
  input: Buffer,
  options: ThumbnailOptions
): ThumbnailResult {
  const result = native.thumbnailSync(input, {
    width: options.width,
    height: options.height,
    format: options.format,
    quality: options.quality,
    shrinkOnLoad: options.shrinkOnLoad,
    filter: options.filter,
    fastMode: options.fastMode,
  });
  return {
    ...result,
    data: Buffer.from(result.data),
  };
}

/**
 * Generate a fast thumbnail asynchronously
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Thumbnail options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to thumbnail result with image data and metadata
 */
export async function thumbnail(
  input: Buffer,
  options: ThumbnailOptions,
  asyncOptions?: AsyncOptions
): Promise<ThumbnailResult> {
  const result = await withAbortSignal<ThumbnailResult>(
    native.thumbnail(input, {
      width: options.width,
      height: options.height,
      format: options.format,
      quality: options.quality,
      shrinkOnLoad: options.shrinkOnLoad,
      filter: options.filter,
      fastMode: options.fastMode,
    }, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
  return {
    ...result,
    data: Buffer.from(result.data),
  };
}

/**
 * Generate a fast thumbnail and return just the buffer synchronously
 */
export function thumbnailBufferSync(
  input: Buffer,
  options: ThumbnailOptions
): Buffer {
  return native.thumbnailBufferSync(input, {
    width: options.width,
    height: options.height,
    format: options.format,
    quality: options.quality,
    shrinkOnLoad: options.shrinkOnLoad,
    filter: options.filter,
    fastMode: options.fastMode,
  });
}

/**
 * Generate a fast thumbnail and return just the buffer asynchronously
 *
 * @param input - Image buffer
 * @param options - Thumbnail options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to image buffer
 */
export async function thumbnailBuffer(
  input: Buffer,
  options: ThumbnailOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.thumbnailBuffer(input, {
      width: options.width,
      height: options.height,
      format: options.format,
      quality: options.quality,
      shrinkOnLoad: options.shrinkOnLoad,
      filter: options.filter,
      fastMode: options.fastMode,
    }, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}
