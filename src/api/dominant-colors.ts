/**
 * Dominant Color Extraction API
 */

import type { DominantColorsResult, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Extract dominant colors from an image asynchronously
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param count - Maximum number of colors to extract (default: 5)
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to DominantColorsResult with colors array and primary color
 */
export async function dominantColors(
  input: Buffer,
  count?: number,
  asyncOptions?: AsyncOptions
): Promise<DominantColorsResult> {
  const result = await withAbortSignal<DominantColorsResult>(
    native.dominantColors(input, count, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
  return {
    colors: result.colors.map((c: { r: number; g: number; b: number; hex: string }) => ({
      r: c.r,
      g: c.g,
      b: c.b,
      hex: c.hex,
    })),
    primary: {
      r: result.primary.r,
      g: result.primary.g,
      b: result.primary.b,
      hex: result.primary.hex,
    },
  };
}

/**
 * Extract dominant colors from an image synchronously
 */
export function dominantColorsSync(
  input: Buffer,
  count?: number
): DominantColorsResult {
  const result = native.dominantColorsSync(input, count);
  return {
    colors: result.colors.map((c: { r: number; g: number; b: number; hex: string }) => ({
      r: c.r,
      g: c.g,
      b: c.b,
      hex: c.hex,
    })),
    primary: {
      r: result.primary.r,
      g: result.primary.g,
      b: result.primary.b,
      hex: result.primary.hex,
    },
  };
}
