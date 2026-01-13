/**
 * Tensor conversion API
 * Convert images to tensor format for ML frameworks
 */

import { native } from '../loader';
import type { TensorOptions, TensorResult, NapiTensorOptions } from '../types';

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
      // Copy data to ensure proper 4-byte alignment for Float32Array
      // Node.js Buffers can have arbitrary byte offsets in shared ArrayBuffer pool
      const copy = new Uint8Array(result.data.length);
      copy.set(result.data);
      return new Float32Array(copy.buffer);
    },
    toUint8Array(): Uint8Array {
      if (result.dtype !== 'Uint8') {
        throw new Error('Cannot convert to Uint8Array: dtype is not Uint8');
      }
      // Return a copy to ensure independence from the original buffer
      return new Uint8Array(result.data);
    },
  };
}

/**
 * Convert image to tensor format for ML frameworks
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Tensor conversion options
 * @returns Tensor data with shape and metadata
 *
 * @example
 * ```typescript
 * // Basic usage (PyTorch/ONNX compatible)
 * const tensor = await toTensor(buffer, {
 *   width: 224,
 *   height: 224,
 *   normalization: 'Imagenet',
 *   layout: 'Chw'
 * });
 *
 * // Use with ONNX Runtime
 * const float32Data = tensor.toFloat32Array();
 * const ortTensor = new ort.Tensor('float32', float32Data, tensor.shape);
 * ```
 */
export async function toTensor(input: Buffer, options?: TensorOptions): Promise<EnhancedTensorResult> {
  const result = await native.toTensor(input, toNapiTensorOptions(options));
  return enhanceTensorResult(result);
}

/**
 * Convert image to tensor format synchronously
 *
 * @param input - Image buffer (JPEG, PNG, WebP, etc.)
 * @param options - Tensor conversion options
 * @returns Tensor data with shape and metadata
 */
export function toTensorSync(input: Buffer, options?: TensorOptions): EnhancedTensorResult {
  const result = native.toTensorSync(input, toNapiTensorOptions(options));
  return enhanceTensorResult(result);
}
