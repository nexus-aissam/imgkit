/**
 * Composite API for overlaying / watermarking images
 */

import type { CompositeOptions, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";
import { toNapiCompositeOptions } from "../converters";

/**
 * Composite one or more layers onto a base image asynchronously.
 *
 * Paints each layer in array order using alpha compositing and the chosen
 * blend mode. Layers can be positioned by gravity (e.g. "southEast" for a
 * bottom-right watermark) or by absolute `left`/`top` coordinates, scaled via
 * `resize`, faded via `opacity`, or tiled across the whole image.
 *
 * @param base - Base image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Layers to composite and output format
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to the composited image buffer (PNG by default)
 *
 * @example
 * ```ts
 * const out = await composite(photo, {
 *   layers: [{ input: logo, gravity: "southEast", opacity: 0.7, offsetX: -20, offsetY: -20 }],
 *   output: { format: "jpeg", jpeg: { quality: 90 } },
 * });
 * ```
 */
export async function composite(
  base: Buffer,
  options: CompositeOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.composite(base, toNapiCompositeOptions(options), asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Composite one or more layers onto a base image synchronously.
 *
 * See {@link composite} for details.
 */
export function compositeSync(base: Buffer, options: CompositeOptions): Buffer {
  return native.compositeSync(base, toNapiCompositeOptions(options));
}
