/**
 * imgkit - High-performance image processing for Bun and Node.js
 *
 * @module imgkit
 * @author Aissam Irhir <aissamirhir@gmail.com>
 *
 * @example
 * ```typescript
 * import { resize, toWebp, metadata } from 'imgkit';
 *
 * // Read image
 * const input = await Bun.file('input.jpg').arrayBuffer();
 *
 * // Resize image
 * const resized = await resize(Buffer.from(input), { width: 800, height: 600 });
 *
 * // Convert to WebP
 * const webp = await toWebp(Buffer.from(input), { quality: 85 });
 *
 * // Get metadata
 * const info = await metadata(Buffer.from(input));
 * console.log(info.width, info.height, info.format);
 * ```
 */

// Re-export types
export type {
  ImageFormat,
  ResizeFilter,
  FitMode,
  CropGravity,
  CropOptions,
  ResizeOptions,
  JpegOptions,
  PngOptions,
  WebPOptions,
  AvifOptions,
  OutputOptions,
  ImageMetadata,
  BlurHashResult,
  ThumbHashResult,
  ThumbHashDecodeResult,
  TransformOptions,
  ExifOptions,
  TensorDtype,
  TensorLayout,
  TensorNormalization,
  TensorOptions,
  TensorResult,
  HashAlgorithm,
  HashSize,
  ImageHashOptions,
  ImageHashResult,
  AspectRatio,
  SmartCropBoostRegion,
  SmartCropOptions,
  SmartCropAnalysis,
  DominantColor,
  DominantColorsResult,
  ThumbnailFormat,
  ThumbnailOptions,
  ThumbnailResult,
  BlendMode,
  CompositeLayer,
  CompositeOptions,
  AsyncOptions,
  CodecBackend,
} from "./types";
export type { EnhancedTensorResult } from "./api";

// Re-export API functions
export {
  metadata,
  metadataSync,
  resize,
  resizeSync,
  crop,
  cropSync,
  toJpeg,
  toJpegSync,
  toPng,
  toPngSync,
  toWebp,
  toWebpSync,
  transform,
  transformSync,
  blurhash,
  blurhashSync,
  thumbhash,
  thumbhashSync,
  thumbhashToRgba,
  thumbhashToRgbaSync,
  thumbhashToDataUrl,
  writeExif,
  writeExifSync,
  stripExif,
  stripExifSync,
  toTensor,
  toTensorSync,
  imageHash,
  imageHashSync,
  imageHashDistance,
  imageHashDistanceSync,
  smartCrop,
  smartCropSync,
  smartCropAnalyze,
  smartCropAnalyzeSync,
  dominantColors,
  dominantColorsSync,
  thumbnail,
  thumbnailSync,
  thumbnailBuffer,
  thumbnailBufferSync,
  composite,
  compositeSync,
} from "./api";

// Import for version and default export
import { native } from "./loader";
import type { CodecBackend } from "./types";

/**
 * Get library version
 */
export function version(): string {
  return native.version();
}

/**
 * Report which codec backend is actually loaded.
 *
 * imgkit ships a native addon (libjpeg-turbo + libwebp) and a WebAssembly
 * build (pure Rust). They share this API but differ in speed and in one output
 * detail, so check here rather than guessing from `process.platform`:
 *
 * ```typescript
 * const b = codecBackend();
 * if (!b.webpLossyEncode) {
 *   // WebP output is lossless here and `quality` has no effect.
 * }
 * ```
 */
export function codecBackend(): CodecBackend {
  return native.codecBackend();
}

// Import functions for default export
import {
  metadata,
  metadataSync,
  resize,
  resizeSync,
  crop,
  cropSync,
  toJpeg,
  toJpegSync,
  toPng,
  toPngSync,
  toWebp,
  toWebpSync,
  transform,
  transformSync,
  blurhash,
  blurhashSync,
  thumbhash,
  thumbhashSync,
  thumbhashToRgba,
  thumbhashToRgbaSync,
  thumbhashToDataUrl,
  writeExif,
  writeExifSync,
  stripExif,
  stripExifSync,
  toTensor,
  toTensorSync,
  imageHash,
  imageHashSync,
  imageHashDistance,
  imageHashDistanceSync,
  smartCrop,
  smartCropSync,
  smartCropAnalyze,
  smartCropAnalyzeSync,
  dominantColors,
  dominantColorsSync,
  thumbnail,
  thumbnailSync,
  thumbnailBuffer,
  thumbnailBufferSync,
  composite,
  compositeSync,
} from "./api";

// Default export for convenience
export default {
  metadata,
  metadataSync,
  resize,
  resizeSync,
  crop,
  cropSync,
  toJpeg,
  toJpegSync,
  toPng,
  toPngSync,
  toWebp,
  toWebpSync,
  transform,
  transformSync,
  blurhash,
  blurhashSync,
  thumbhash,
  thumbhashSync,
  thumbhashToRgba,
  thumbhashToRgbaSync,
  thumbhashToDataUrl,
  writeExif,
  writeExifSync,
  stripExif,
  stripExifSync,
  toTensor,
  toTensorSync,
  imageHash,
  imageHashSync,
  imageHashDistance,
  imageHashDistanceSync,
  smartCrop,
  smartCropSync,
  smartCropAnalyze,
  smartCropAnalyzeSync,
  dominantColors,
  dominantColorsSync,
  thumbnail,
  thumbnailSync,
  thumbnailBuffer,
  thumbnailBufferSync,
  composite,
  compositeSync,
  version,
  codecBackend,
};
