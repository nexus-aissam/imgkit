/**
 * Option conversion utilities for bun-image-turbo
 *
 * Converts TypeScript options to NAPI-compatible format for Rust bindings.
 */

import type {
  ResizeOptions,
  TransformOptions,
  NapiResizeOptions,
  NapiTransformOptions,
} from "./types";

/**
 * Convert resize filter to napi format
 */
export function toNapiFilter(filter?: string): string | undefined {
  if (!filter) return undefined;
  // Convert camelCase to PascalCase for Rust enum
  return filter.charAt(0).toUpperCase() + filter.slice(1);
}

/**
 * Convert fit mode to napi format
 */
export function toNapiFit(fit?: string): string | undefined {
  if (!fit) return undefined;
  return fit.charAt(0).toUpperCase() + fit.slice(1);
}

/**
 * Convert resize options to napi format
 */
export function toNapiResizeOptions(options: ResizeOptions): NapiResizeOptions {
  return {
    width: options.width,
    height: options.height,
    filter: toNapiFilter(options.filter),
    fit: toNapiFit(options.fit),
    background: options.background,
  };
}

/**
 * Convert format string to Rust enum format
 */
export function toNapiFormat(format: string): string {
  const formatMap: Record<string, string> = {
    jpeg: "Jpeg",
    png: "Png",
    webp: "WebP",
    gif: "Gif",
    bmp: "Bmp",
    ico: "Ico",
    tiff: "Tiff",
    heic: "Heic",
    avif: "Avif",
  };
  return formatMap[format.toLowerCase()] || format;
}

/**
 * Convert transform options to napi format
 */
export function toNapiTransformOptions(
  options: TransformOptions
): NapiTransformOptions {
  const result: NapiTransformOptions = {};

  if (options.resize) {
    result.resize = toNapiResizeOptions(options.resize);
  }

  if (options.output) {
    result.output = {
      format: toNapiFormat(options.output.format),
      jpeg: options.output.jpeg,
      png: options.output.png,
      webp: options.output.webp,
    };
  }

  result.rotate = options.rotate;
  result.flipH = options.flipH;
  result.flipV = options.flipV;
  result.grayscale = options.grayscale;
  result.blur = options.blur;
  result.sharpen = options.sharpen;
  result.brightness = options.brightness;
  result.contrast = options.contrast;

  if (options.exif) {
    result.exif = options.exif;
  }

  return result;
}
