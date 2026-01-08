//! WebP decoding with shrink-on-load optimization
//!
//! Uses libwebp's native scaling feature to decode directly to target resolution.
//! This provides 2-25x memory reduction and significant speed improvements
//! compared to decoding full image then resizing.
//!
//! Key benefits:
//! - Memory scales with OUTPUT size, not INPUT size
//! - Faster decoding (skips unnecessary pixel processing)
//! - Multi-threaded decoding via use_threads

use image::{DynamicImage, RgbImage, RgbaImage};

use crate::error::ImageError;

/// Maximum pixel count before we require memory protection (100 megapixels)
const MAX_PIXELS_DEFAULT: u64 = 100_000_000;

/// Decode WebP with optional target dimensions for shrink-on-load optimization
/// When target dimensions are provided, the image is scaled during decode
#[inline]
pub fn decode_webp_with_target(
    data: &[u8],
    target_width: Option<u32>,
    target_height: Option<u32>,
) -> Result<DynamicImage, ImageError> {
    use libwebp_sys::{
        WebPDecoderConfig, WebPGetFeatures, WebPInitDecoderConfig,
        WebPDecode, WebPFreeDecBuffer, MODE_RGB, MODE_RGBA, VP8_STATUS_OK,
    };

    unsafe {
        // Initialize decoder config
        let mut config: WebPDecoderConfig = std::mem::zeroed();
        if WebPInitDecoderConfig(&mut config) == 0 {
            return Err(ImageError::DecodeError(
                "Failed to init WebP decoder config".to_string(),
            ));
        }

        // Get image features (dimensions, has_alpha)
        let status = WebPGetFeatures(data.as_ptr(), data.len(), &mut config.input);
        if status != VP8_STATUS_OK {
            return Err(ImageError::DecodeError(format!(
                "Failed to get WebP features: {:?}",
                status
            )));
        }

        let src_width = config.input.width as u32;
        let src_height = config.input.height as u32;
        let has_alpha = config.input.has_alpha != 0;

        // Check image size limit
        let pixel_count = src_width as u64 * src_height as u64;
        if pixel_count > MAX_PIXELS_DEFAULT {
            return Err(ImageError::DecodeError(format!(
                "WebP image too large: {}x{} ({} megapixels) exceeds limit of {} megapixels",
                src_width,
                src_height,
                pixel_count / 1_000_000,
                MAX_PIXELS_DEFAULT / 1_000_000
            )));
        }

        // Calculate target dimensions
        let (final_width, final_height) = calculate_scaled_dimensions(
            src_width,
            src_height,
            target_width,
            target_height,
        );

        // Determine if we should use scaling
        // Only scale if target is significantly smaller (at least 1.5x)
        let should_scale = final_width < src_width * 2 / 3 || final_height < src_height * 2 / 3;

        let (decode_width, decode_height) = if should_scale {
            (final_width, final_height)
        } else {
            (src_width, src_height)
        };

        // Set up decoder options
        config.options.use_scaling = if should_scale { 1 } else { 0 };
        config.options.scaled_width = decode_width as i32;
        config.options.scaled_height = decode_height as i32;
        config.options.use_threads = 1; // Enable multi-threaded decoding
        config.options.no_fancy_upsampling = 0; // Keep quality

        // Set output colorspace
        config.output.colorspace = if has_alpha { MODE_RGBA } else { MODE_RGB };

        // Decode the image
        let status = WebPDecode(data.as_ptr(), data.len(), &mut config);
        if status != VP8_STATUS_OK {
            WebPFreeDecBuffer(&mut config.output);
            return Err(ImageError::DecodeError(format!(
                "WebP decode failed: {:?}",
                status
            )));
        }

        // Extract the decoded pixels
        let output = &config.output;
        let rgba = output.u.RGBA;
        let stride = rgba.stride as usize;
        let width = decode_width as usize;
        let height = decode_height as usize;
        let bytes_per_pixel = if has_alpha { 4 } else { 3 };
        let row_bytes = width * bytes_per_pixel;

        // Copy pixels to a new buffer (we need to free the WebP buffer)
        let pixels = if stride == row_bytes {
            // Fast path: contiguous memory
            let total_bytes = width * height * bytes_per_pixel;
            let slice = std::slice::from_raw_parts(rgba.rgba, total_bytes);
            slice.to_vec()
        } else {
            // Slow path: stride doesn't match, copy row by row
            let mut pixels = Vec::with_capacity(width * height * bytes_per_pixel);
            for y in 0..height {
                let row_start = y * stride;
                let _row_end = row_start + row_bytes;
                let slice = std::slice::from_raw_parts(
                    rgba.rgba.add(row_start),
                    row_bytes,
                );
                pixels.extend_from_slice(slice);
            }
            pixels
        };

        // Free the WebP decode buffer
        WebPFreeDecBuffer(&mut config.output);

        // Create DynamicImage
        if has_alpha {
            let img = RgbaImage::from_raw(decode_width, decode_height, pixels)
                .ok_or_else(|| {
                    ImageError::DecodeError("Failed to create RGBA image from WebP".to_string())
                })?;
            Ok(DynamicImage::ImageRgba8(img))
        } else {
            let img = RgbImage::from_raw(decode_width, decode_height, pixels)
                .ok_or_else(|| {
                    ImageError::DecodeError("Failed to create RGB image from WebP".to_string())
                })?;
            Ok(DynamicImage::ImageRgb8(img))
        }
    }
}

/// Calculate scaled dimensions maintaining aspect ratio
fn calculate_scaled_dimensions(
    src_width: u32,
    src_height: u32,
    target_width: Option<u32>,
    target_height: Option<u32>,
) -> (u32, u32) {
    match (target_width, target_height) {
        (Some(tw), Some(th)) => (tw, th),
        (Some(tw), None) => {
            // Scale height proportionally
            let scale = tw as f64 / src_width as f64;
            let th = (src_height as f64 * scale).round() as u32;
            (tw, th.max(1))
        }
        (None, Some(th)) => {
            // Scale width proportionally
            let scale = th as f64 / src_height as f64;
            let tw = (src_width as f64 * scale).round() as u32;
            (tw.max(1), th)
        }
        (None, None) => (src_width, src_height),
    }
}

/// Fast WebP decode without scaling (for when no target dimensions provided)
/// Falls back to the webp crate for simplicity
#[inline]
pub fn decode_webp_fast(data: &[u8]) -> Result<DynamicImage, ImageError> {
    // For non-scaled decodes, use the simpler webp crate
    let decoder = webp::Decoder::new(data);
    let webp_image = decoder
        .decode()
        .ok_or_else(|| ImageError::DecodeError("Failed to decode WebP".to_string()))?;

    let width = webp_image.width();
    let height = webp_image.height();
    let has_alpha = webp_image.is_alpha();

    if has_alpha {
        let rgba_data = webp_image.to_vec();
        let img = RgbaImage::from_raw(width, height, rgba_data).ok_or_else(|| {
            ImageError::DecodeError("Failed to create RGBA image from WebP".to_string())
        })?;
        Ok(DynamicImage::ImageRgba8(img))
    } else {
        // WebP decoder returns RGBA, convert to RGB
        let rgba_data = webp_image.to_vec();
        let mut rgb_data = Vec::with_capacity((width * height * 3) as usize);
        for chunk in rgba_data.chunks(4) {
            rgb_data.push(chunk[0]); // R
            rgb_data.push(chunk[1]); // G
            rgb_data.push(chunk[2]); // B
        }
        let img = RgbImage::from_raw(width, height, rgb_data).ok_or_else(|| {
            ImageError::DecodeError("Failed to create RGB image from WebP".to_string())
        })?;
        Ok(DynamicImage::ImageRgb8(img))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_scaled_dimensions() {
        // Both dimensions provided
        assert_eq!(calculate_scaled_dimensions(1000, 500, Some(200), Some(100)), (200, 100));

        // Only width provided
        assert_eq!(calculate_scaled_dimensions(1000, 500, Some(500), None), (500, 250));

        // Only height provided
        assert_eq!(calculate_scaled_dimensions(1000, 500, None, Some(250)), (500, 250));

        // No dimensions provided
        assert_eq!(calculate_scaled_dimensions(1000, 500, None, None), (1000, 500));
    }
}
