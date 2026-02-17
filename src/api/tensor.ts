/**
 * Tensor conversion API
 * Convert images to tensor format for ML frameworks
 */

import { native } from '../loader';
import type { TensorOptions, TensorResult, NapiTensorOptions, AsyncOptions } from '../types';
import { withAbortSignal } from '../abort';

/**
 * Convert tensor options to native format
 */
function toNapiTensorOptions(options?: TensorOptions): NapiTensorOptions | undefined {
  if (!options) return undefined;
  return {
    dtype: options.dtype,
    layout: options.layout,
    normalization: options.normalization,
    width: options.width,
    height: options.height,
    batch: options.batch,
  };
}

/**
 * Enhanced tensor result with helper methods
 */
export interface EnhancedTensorResult extends TensorResult {
  /** Convert data to Float32Array (for Float32 dtype) */
  toFloat32Array(): Float32Array;
  /** Convert data to Uint8Array (for Uint8 dtype) */
  toUint8Array(): Uint8Array;
}

/**
 * Enhance tensor result with helper methods
 */
function enhanceTensorResult(result: TensorResult): EnhancedTensorResult {
  return {
    ...result,
    toFloat32Array(): Float32Array {
      if (result.dtype !== 'Float32') {
        throw new Error('Cannot convert to Float32Array: dtype is not Float32');
      }
      const copy = new Uint8Array(result.data.length);
      copy.set(result.data);
      return new Float32Array(copy.buffer);
    },
    toUint8Array(): Uint8Array {
      if (result.dtype !== 'Uint8') {
        throw new Error('Cannot convert to Uint8Array: dtype is not Uint8');
      }
      return new Uint8Array(result.data);
    },
  };
}

/**
 * Convert image to tensor format for ML frameworks
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Tensor conversion options
 * @param asyncOptions - Timeout and cancellation options
 * @returns Tensor data with shape and metadata
 */
export async function toTensor(
  input: Buffer,
  options?: TensorOptions,
  asyncOptions?: AsyncOptions
): Promise<EnhancedTensorResult> {
  const result = await withAbortSignal<TensorResult>(
    native.toTensor(input, toNapiTensorOptions(options), asyncOptions?.timeoutMs),
    asyncOptions?.signal
  );
  return enhanceTensorResult(result);
}

/**
 * Convert image to tensor format synchronously
 */
export function toTensorSync(input: Buffer, options?: TensorOptions): EnhancedTensorResult {
  const result = native.toTensorSync(input, toNapiTensorOptions(options));
  return enhanceTensorResult(result);
}
