//! Tensor conversion module for ML preprocessing
//!
//! Converts images to tensor format optimized for ML frameworks.
//! Uses SIMD acceleration and parallel processing for maximum performance.

use crate::decode;
use crate::error::ImageError;
use crate::resize;
use crate::types::{FitMode, ResizeOptions, TensorDtype, TensorLayout, TensorNormalization, TensorOptions, TensorResult};
use image::GenericImageView;
use rayon::prelude::*;

/// ImageNet normalization constants (RGB order)
const IMAGENET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [f32; 3] = [0.229, 0.224, 0.225];

/// CLIP normalization constants (RGB order)
const CLIP_MEAN: [f32; 3] = [0.48145466, 0.4578275, 0.40821073];
const CLIP_STD: [f32; 3] = [0.26862954, 0.26130258, 0.27577711];

/// Convert image to tensor format
pub fn image_to_tensor(input: &[u8], options: &TensorOptions) -> Result<TensorResult, ImageError> {
    // Decode image, optionally with shrink-on-load for resize
    let img = if options.width.is_some() || options.height.is_some() {
        decode::decode_image_with_target(input, options.width, options.height)?
    } else {
        decode::decode_image(input)?
    };

    // Resize if needed - use Fill mode for exact dimensions (ML models need exact sizes)
    let img = if options.width.is_some() && options.height.is_some() {
        let resize_opts = ResizeOptions {
            width: options.width,
            height: options.height,
            filter: None,
            fit: Some(FitMode::Fill), // Force exact dimensions for ML
            background: None,
        };
        resize::resize_image(img, &resize_opts)?
    } else if options.width.is_some() || options.height.is_some() {
        let resize_opts = ResizeOptions {
            width: options.width,
            height: options.height,
            filter: None,
            fit: None,
            background: None,
        };
        resize::resize_image(img, &resize_opts)?
    } else {
        img
    };

    // Get dimensions
    let (width, height) = img.dimensions();
    let channels = 3u32; // Always RGB for ML

    // Get RGB pixels (strip alpha if present)
    let rgb = img.to_rgb8();
    let pixels = rgb.as_raw();

    // Get normalization parameters
    let (mean, std) = get_normalization_params(&options.normalization);

    // Determine output layout
    let layout = options.layout.clone().unwrap_or(TensorLayout::Chw);

    // Convert to tensor based on dtype and layout
    let dtype = options.dtype.clone().unwrap_or(TensorDtype::Float32);
    let batch = options.batch.unwrap_or(false);

    let (data, shape) = match (&dtype, &layout) {
        (TensorDtype::Float32, TensorLayout::Chw) => {
            convert_to_f32_chw(pixels, width, height, &mean, &std, batch)
        }
        (TensorDtype::Float32, TensorLayout::Hwc) => {
            convert_to_f32_hwc(pixels, width, height, &mean, &std, batch)
        }
        (TensorDtype::Uint8, TensorLayout::Chw) => {
            convert_to_u8_chw(pixels, width, height, batch)
        }
        (TensorDtype::Uint8, TensorLayout::Hwc) => {
            convert_to_u8_hwc(pixels, width, height, batch)
        }
    };

    Ok(TensorResult {
        data,
        shape,
        dtype,
        layout,
        width,
        height,
        channels,
    })
}

/// Get normalization mean and std from preset or custom values
fn get_normalization_params(norm: &Option<TensorNormalization>) -> ([f32; 3], [f32; 3]) {
    match norm {
        Some(TensorNormalization::Imagenet) => (IMAGENET_MEAN, IMAGENET_STD),
        Some(TensorNormalization::Clip) => (CLIP_MEAN, CLIP_STD),
        Some(TensorNormalization::ZeroOne) => ([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
        Some(TensorNormalization::NegOneOne) => ([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
        Some(TensorNormalization::None) | None => ([0.0, 0.0, 0.0], [255.0, 255.0, 255.0]),
    }
}

/// Convert HWC u8 pixels to CHW f32 tensor with normalization
/// Uses parallel processing for each channel
fn convert_to_f32_chw(
    pixels: &[u8],
    width: u32,
    height: u32,
    mean: &[f32; 3],
    std: &[f32; 3],
    batch: bool,
) -> (Vec<u8>, Vec<u32>) {
    let hw = (width * height) as usize;
    let total = 3 * hw;
    let mut output = vec![0.0f32; total];

    // Split output into channel planes for parallel processing
    let (r_plane, rest) = output.split_at_mut(hw);
    let (g_plane, b_plane) = rest.split_at_mut(hw);

    // Process each channel in parallel
    rayon::scope(|s| {
        s.spawn(|_| {
            process_channel_f32(pixels, r_plane, 0, hw, mean[0], std[0]);
        });
        s.spawn(|_| {
            process_channel_f32(pixels, g_plane, 1, hw, mean[1], std[1]);
        });
        s.spawn(|_| {
            process_channel_f32(pixels, b_plane, 2, hw, mean[2], std[2]);
        });
    });

    // Convert f32 to bytes
    let bytes: Vec<u8> = output
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();

    let shape = if batch {
        vec![1, 3, height, width]
    } else {
        vec![3, height, width]
    };

    (bytes, shape)
}

/// Convert HWC u8 pixels to HWC f32 tensor with normalization
fn convert_to_f32_hwc(
    pixels: &[u8],
    width: u32,
    height: u32,
    mean: &[f32; 3],
    std: &[f32; 3],
    batch: bool,
) -> (Vec<u8>, Vec<u32>) {
    let hw = (width * height) as usize;

    // Pre-compute inverse std for faster division
    let inv_std = [1.0 / std[0], 1.0 / std[1], 1.0 / std[2]];

    // Process in parallel chunks for better cache utilization
    let output: Vec<f32> = (0..hw)
        .into_par_iter()
        .flat_map(|i| {
            let base = i * 3;
            [
                (pixels[base] as f32 / 255.0 - mean[0]) * inv_std[0],
                (pixels[base + 1] as f32 / 255.0 - mean[1]) * inv_std[1],
                (pixels[base + 2] as f32 / 255.0 - mean[2]) * inv_std[2],
            ]
        })
        .collect();

    // Convert f32 to bytes
    let bytes: Vec<u8> = output
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();

    let shape = if batch {
        vec![1, height, width, 3]
    } else {
        vec![height, width, 3]
    };

    (bytes, shape)
}

/// Convert HWC u8 pixels to CHW u8 tensor (no normalization)
fn convert_to_u8_chw(
    pixels: &[u8],
    width: u32,
    height: u32,
    batch: bool,
) -> (Vec<u8>, Vec<u32>) {
    let hw = (width * height) as usize;
    let mut output = vec![0u8; 3 * hw];

    // Split output into channel planes
    let (r_plane, rest) = output.split_at_mut(hw);
    let (g_plane, b_plane) = rest.split_at_mut(hw);

    // Process each channel in parallel
    rayon::scope(|s| {
        s.spawn(|_| {
            for i in 0..hw {
                r_plane[i] = pixels[i * 3];
            }
        });
        s.spawn(|_| {
            for i in 0..hw {
                g_plane[i] = pixels[i * 3 + 1];
            }
        });
        s.spawn(|_| {
            for i in 0..hw {
                b_plane[i] = pixels[i * 3 + 2];
            }
        });
    });

    let shape = if batch {
        vec![1, 3, height, width]
    } else {
        vec![3, height, width]
    };

    (output, shape)
}

/// Convert HWC u8 pixels to HWC u8 tensor (already in correct layout)
fn convert_to_u8_hwc(
    pixels: &[u8],
    width: u32,
    height: u32,
    batch: bool,
) -> (Vec<u8>, Vec<u32>) {
    let shape = if batch {
        vec![1, height, width, 3]
    } else {
        vec![height, width, 3]
    };

    (pixels.to_vec(), shape)
}

/// Process a single channel with SIMD-friendly loop
/// Optimized for cache locality and auto-vectorization
#[inline]
fn process_channel_f32(
    input: &[u8],
    output: &mut [f32],
    channel: usize,
    hw: usize,
    mean: f32,
    std: f32,
) {
    let inv_std = 1.0 / std;
    let scale = 1.0 / 255.0;

    // Process in chunks for better vectorization
    const CHUNK_SIZE: usize = 8;
    let chunks = hw / CHUNK_SIZE;
    let remainder = hw % CHUNK_SIZE;

    // Main loop - compiler can auto-vectorize this
    for chunk in 0..chunks {
        let base = chunk * CHUNK_SIZE;
        for i in 0..CHUNK_SIZE {
            let idx = base + i;
            let pixel = input[idx * 3 + channel] as f32;
            output[idx] = (pixel * scale - mean) * inv_std;
        }
    }

    // Handle remainder
    let base = chunks * CHUNK_SIZE;
    for i in 0..remainder {
        let idx = base + i;
        let pixel = input[idx * 3 + channel] as f32;
        output[idx] = (pixel * scale - mean) * inv_std;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalization_params() {
        let (mean, std) = get_normalization_params(&Some(TensorNormalization::Imagenet));
        assert!((mean[0] - 0.485).abs() < 0.001);
        assert!((std[0] - 0.229).abs() < 0.001);
    }
}
