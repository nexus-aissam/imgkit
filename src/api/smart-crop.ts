/**
 * Smart Crop API for content-aware image cropping
 */

import type { SmartCropOptions, SmartCropAnalysis, AsyncOptions } from "../types";
import { native } from "../loader";
import { withAbortSignal } from "../abort";

/**
 * Smart crop an image using content-aware detection asynchronously
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Smart crop options (width, height, or aspectRatio)
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to cropped image buffer (PNG format)
 */
export async function smartCrop(
  input: Buffer,
  options: SmartCropOptions,
  asyncOptions?: AsyncOptions
): Promise<Buffer> {
  return withAbortSignal(
    native.smartCrop(input, {
      width: options.width,
      height: options.height,
      aspectRatio: options.aspectRatio,
      boost: options.boost,
    }, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
}

/**
 * Smart crop an image using content-aware detection synchronously
 */
export function smartCropSync(
  input: Buffer,
  options: SmartCropOptions
): Buffer {
  return native.smartCropSync(input, {
    width: options.width,
    height: options.height,
    aspectRatio: options.aspectRatio,
    boost: options.boost,
  });
}

/**
 * Analyze an image and find the best crop region asynchronously
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Smart crop options (width, height, or aspectRatio)
 * @param asyncOptions - Timeout and cancellation options
 * @returns Promise resolving to SmartCropAnalysis with crop coordinates and score
 */
export async function smartCropAnalyze(
  input: Buffer,
  options: SmartCropOptions,
  asyncOptions?: AsyncOptions
): Promise<SmartCropAnalysis> {
  const result = await withAbortSignal<SmartCropAnalysis>(
    native.smartCropAnalyze(input, {
      width: options.width,
      height: options.height,
      aspectRatio: options.aspectRatio,
      boost: options.boost,
    }, asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
  return {
    x: result.x,
    y: result.y,
    width: result.width,
    height: result.height,
    score: result.score,
  };
}

/**
 * Analyze an image and find the best crop region synchronously
 */
export function smartCropAnalyzeSync(
  input: Buffer,
  options: SmartCropOptions
): SmartCropAnalysis {
  const result = native.smartCropAnalyzeSync(input, {
    width: options.width,
    height: options.height,
    aspectRatio: options.aspectRatio,
    boost: options.boost,
  });
  return {
    x: result.x,
    y: result.y,
    width: result.width,
    height: result.height,
    score: result.score,
  };
}
