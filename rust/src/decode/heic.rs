//! HEIC/HEIF decoding using libheif
//!
//! Supports scale-on-decode for better performance when downscaling.
//! Only available on platforms with libheif support (macOS ARM64).

use image::DynamicImage;

use crate::error::ImageError;

/// Maximum pixel count before we require memory protection (100 megapixels)
#[cfg(feature = "heic")]
const MAX_PIXELS_DEFAULT: u64 = 100_000_000;

/// Decode HEIC/HEIF with optional target dimensions for shrink-on-decode optimization
/// When target dimensions are provided, the image is scaled during decode for better performance
#[cfg(feature = "heic")]
#[inline]
pub fn decode_heic_with_target(
  data: &[u8],
  target_width: Option<u32>,
  target_height: Option<u32>,
) -> Result<DynamicImage, ImageError> {
  use image::{RgbImage, RgbaImage};
  use libheif_rs::{ColorSpace, HeifContext, LibHeif, RgbChroma};

  // Create libheif instance
  let lib_heif = LibHeif::new();

  // Create context from memory
  let ctx = HeifContext::read_from_bytes(data)
    .map_err(|e| ImageError::DecodeError(format!("HEIC context error: {}", e)))?;

  // Get primary image handle
  let handle = ctx
    .primary_image_handle()
    .map_err(|e| ImageError::DecodeError(format!("HEIC handle error: {}", e)))?;

  let src_width = handle.width();
  let src_height = handle.height();

  // Check image size limit
  let pixel_count = src_width as u64 * src_height as u64;
  if pixel_count > MAX_PIXELS_DEFAULT {
    return Err(ImageError::DecodeError(format!(
      "HEIC image too large: {}x{} ({} megapixels) exceeds limit of {} megapixels",
      src_width,
      src_height,
      pixel_count / 1_000_000,
      MAX_PIXELS_DEFAULT / 1_000_000
    )));
  }

  // Check if image has alpha channel
  let has_alpha = handle.has_alpha_channel();

  // Decode to RGB or RGBA
  let decoded = if has_alpha {
    lib_heif
      .decode(&handle, ColorSpace::Rgb(RgbChroma::Rgba), None)
      .map_err(|e| ImageError::DecodeError(format!("HEIC decode error: {}", e)))?
  } else {
    lib_heif
      .decode(&handle, ColorSpace::Rgb(RgbChroma::Rgb), None)
      .map_err(|e| ImageError::DecodeError(format!("HEIC decode error: {}", e)))?
  };

  // Apply shrink-on-decode if target dimensions are significantly smaller
  let image = if let (Some(tw), Some(th)) = (target_width, target_height) {
    // Only scale if target is at least 2x smaller in both dimensions
    if tw < src_width / 2 && th < src_height / 2 {
      decoded
        .scale(tw, th, None)
        .map_err(|e| ImageError::DecodeError(format!("HEIC scale error: {}", e)))?
    } else {
      decoded
    }
  } else if let Some(tw) = target_width {
    if tw < src_width / 2 {
      let th = (src_height as f64 * tw as f64 / src_width as f64) as u32;
      decoded
        .scale(tw, th, None)
        .map_err(|e| ImageError::DecodeError(format!("HEIC scale error: {}", e)))?
    } else {
      decoded
    }
  } else if let Some(th) = target_height {
    if th < src_height / 2 {
      let tw = (src_width as f64 * th as f64 / src_height as f64) as u32;
      decoded
        .scale(tw, th, None)
        .map_err(|e| ImageError::DecodeError(format!("HEIC scale error: {}", e)))?
    } else {
      decoded
    }
  } else {
    decoded
  };

  // Get final dimensions after potential scaling
  let width = image.width();
  let height = image.height();

  // Get interleaved RGB(A) data
  let planes = image.planes();
  let interleaved = planes
    .interleaved
    .ok_or_else(|| ImageError::DecodeError("HEIC: No interleaved data".to_string()))?;

  let stride = interleaved.stride;
  let pixel_data = interleaved.data;
  let bytes_per_pixel = if has_alpha { 4 } else { 3 };
  let row_bytes = width as usize * bytes_per_pixel;

  // Optimized pixel extraction - use memcpy when stride matches row width
  if stride == row_bytes {
    // Fast path: contiguous memory, direct copy
    let total_bytes = (width * height) as usize * bytes_per_pixel;
    let pixels = pixel_data[..total_bytes].to_vec();

    if has_alpha {
      let img = RgbaImage::from_raw(width, height, pixels).ok_or_else(|| {
        ImageError::DecodeError("Failed to create RGBA image from HEIC".to_string())
      })?;
      Ok(DynamicImage::ImageRgba8(img))
    } else {
      let img = RgbImage::from_raw(width, height, pixels).ok_or_else(|| {
        ImageError::DecodeError("Failed to create RGB image from HEIC".to_string())
      })?;
      Ok(DynamicImage::ImageRgb8(img))
    }
  } else {
    // Slow path: stride doesn't match, need row-by-row copy
    let mut pixels = Vec::with_capacity((width * height) as usize * bytes_per_pixel);

    for y in 0..height as usize {
      let row_start = y * stride;
      let row_end = row_start + row_bytes;
      pixels.extend_from_slice(&pixel_data[row_start..row_end]);
    }

    if has_alpha {
      let img = RgbaImage::from_raw(width, height, pixels).ok_or_else(|| {
        ImageError::DecodeError("Failed to create RGBA image from HEIC".to_string())
      })?;
      Ok(DynamicImage::ImageRgba8(img))
    } else {
      let img = RgbImage::from_raw(width, height, pixels).ok_or_else(|| {
        ImageError::DecodeError("Failed to create RGB image from HEIC".to_string())
      })?;
      Ok(DynamicImage::ImageRgb8(img))
    }
  }
}

/// Placeholder when HEIC feature is not enabled
#[cfg(not(feature = "heic"))]
pub fn decode_heic_with_target(
  _data: &[u8],
  _target_width: Option<u32>,
  _target_height: Option<u32>,
) -> Result<DynamicImage, ImageError> {
  Err(ImageError::UnsupportedFormat(
    "HEIC/HEIF support not available. Install with 'heic' feature enabled.".to_string(),
  ))
}
