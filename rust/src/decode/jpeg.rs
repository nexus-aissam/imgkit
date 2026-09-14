//! JPEG decoding with shrink-on-load optimization
//!
//! Two backends, selected by the `native-codecs` cargo feature:
//!
//! - **native** (default): turbojpeg (libjpeg-turbo with SIMD). Supports
//!   scale-on-decode for massive performance gains when downscaling.
//! - **pure-rust** (`--no-default-features`): the `image` crate's zune-jpeg
//!   backend. Portable (builds for wasm32), but has **no scaled-decode API**,
//!   so shrink-on-load degrades to a full-resolution decode. Output is
//!   correct either way; only the decode cost differs.

#[allow(unused_imports)] // RgbImage is used by the native backend and by tests
use image::{DynamicImage, RgbImage};

use crate::error::ImageError;

#[allow(unused_imports)]
use super::generic::decode_with_image_crate_safe;

/// JPEG shrink-on-load using turbojpeg (libjpeg-turbo with SIMD)
#[allow(dead_code)] // convenience wrapper; the native decode path calls the _mode variant
/// This decodes JPEG at reduced resolution - THE key optimization
/// Much faster than mozjpeg because turbojpeg uses SIMD (SSE2/AVX2/NEON)
/// Scale factors: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8, 1/1
pub fn decode_jpeg_with_shrink(
  data: &[u8],
  target_width: Option<u32>,
  target_height: Option<u32>,
) -> Result<DynamicImage, ImageError> {
  decode_jpeg_with_shrink_mode(data, target_width, target_height, false)
}

/// JPEG shrink-on-load with fast mode option
/// Fast mode uses more aggressive scaling for maximum speed
#[cfg(feature = "native-codecs")]
pub fn decode_jpeg_with_shrink_mode(
  data: &[u8],
  target_width: Option<u32>,
  target_height: Option<u32>,
  fast_mode: bool,
) -> Result<DynamicImage, ImageError> {
  // First, get original dimensions using fast header parsing
  let (src_width, src_height) = get_jpeg_dimensions_fast(data)?;

  // Calculate optimal shrink factor (more aggressive in fast mode)
  let (scale_num, scale_denom) =
    calculate_jpeg_scale_factor_with_mode(src_width, src_height, target_width, target_height, fast_mode);

  // Use turbojpeg with SIMD-accelerated shrink-on-load
  let mut decompressor = turbojpeg::Decompressor::new()
    .map_err(|e| ImageError::DecodeError(format!("TurboJPEG init failed: {:?}", e)))?;

  // Set scaling factor
  let scaling = turbojpeg::ScalingFactor::new(scale_num as usize, scale_denom as usize);
  decompressor
    .set_scaling_factor(scaling)
    .map_err(|e| ImageError::DecodeError(format!("TurboJPEG scale failed: {:?}", e)))?;

  // Read header to get scaled dimensions
  let header = decompressor
    .read_header(data)
    .map_err(|e| ImageError::DecodeError(format!("TurboJPEG header failed: {:?}", e)))?;

  let scaled_width = scaling.scale(header.width);
  let scaled_height = scaling.scale(header.height);

  // Allocate output buffer for scaled image
  let pitch = scaled_width * 3; // RGB = 3 bytes per pixel
  let mut pixels = vec![0u8; pitch * scaled_height];

  // Create output image structure
  let output = turbojpeg::Image {
    pixels: pixels.as_mut_slice(),
    width: scaled_width,
    pitch,
    height: scaled_height,
    format: turbojpeg::PixelFormat::RGB,
  };

  // Decompress at scaled resolution
  decompressor
    .decompress(data, output)
    .map_err(|e| ImageError::DecodeError(format!("TurboJPEG decompress failed: {:?}", e)))?;

  let img = RgbImage::from_raw(scaled_width as u32, scaled_height as u32, pixels).ok_or_else(
    || ImageError::DecodeError("Failed to create image from decoded data".to_string()),
  )?;

  Ok(DynamicImage::ImageRgb8(img))
}

/// Calculate optimal JPEG scale factor for shrink-on-load
/// Returns (numerator, denominator) for turbojpeg ScalingFactor
/// Uses same logic as sharp/libvips for optimal quality
#[allow(dead_code)] // scale factors only drive the native (turbojpeg) decode path
pub fn calculate_jpeg_scale_factor(
  src_width: u32,
  src_height: u32,
  target_width: Option<u32>,
  target_height: Option<u32>,
) -> (i32, i32) {
  calculate_jpeg_scale_factor_with_mode(src_width, src_height, target_width, target_height, false)
}

/// Calculate JPEG scale factor with optional fast mode
/// Fast mode uses more aggressive scaling for maximum speed
#[allow(dead_code)] // scale factors only drive the native (turbojpeg) decode path
pub fn calculate_jpeg_scale_factor_with_mode(
  src_width: u32,
  src_height: u32,
  target_width: Option<u32>,
  target_height: Option<u32>,
  fast_mode: bool,
) -> (i32, i32) {
  // Calculate target dimensions
  let (tw, th) = match (target_width, target_height) {
    (Some(w), Some(h)) => (w, h),
    (Some(w), None) => {
      let ratio = w as f64 / src_width as f64;
      (w, (src_height as f64 * ratio) as u32)
    }
    (None, Some(h)) => {
      let ratio = h as f64 / src_height as f64;
      ((src_width as f64 * ratio) as u32, h)
    }
    (None, None) => return (1, 1), // No target = full resolution
  };

  // Calculate shrink ratio (how much smaller is target vs source)
  let hshrink = src_width as f64 / tw as f64;
  let vshrink = src_height as f64 / th as f64;
  let shrink = hshrink.min(vshrink); // Use minimum to ensure we have enough pixels

  // Scale factors available: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8, 1/1
  // SIMD-accelerated: 1/2, 1/4 (fastest)

  if fast_mode {
    // FAST MODE: Be more aggressive - use smaller scale factor
    // This decodes fewer pixels, trading quality for speed
    // Accept that we may need to upscale slightly at the end
    if shrink >= 4.0 {
      (1, 8) // 1/8 = 12.5% - ultra aggressive
    } else if shrink >= 2.0 {
      (1, 4) // 1/4 = 25% - aggressive
    } else if shrink >= 1.5 {
      (1, 2) // 1/2 = 50%
    } else {
      (1, 1) // 1/1 = full resolution
    }
  } else {
    // NORMAL MODE: Conservative shrinking for best quality
    // Ensure we have enough pixels for high-quality final resize
    if shrink >= 8.0 {
      (1, 8) // 1/8 = 12.5% - for massive downscales
    } else if shrink >= 4.0 {
      (1, 4) // 1/4 = 25% - for large downscales
    } else if shrink >= 2.0 {
      (1, 2) // 1/2 = 50% - for medium downscales
    } else {
      (1, 1) // 1/1 = 100% - full resolution
    }
  }
}

/// Fast JPEG dimension extraction from header
#[allow(dead_code)] // header fast-path is a native-decode optimisation
pub fn get_jpeg_dimensions_fast(data: &[u8]) -> Result<(u32, u32), ImageError> {
  let mut pos = 2; // Skip SOI
  let limit = data.len().min(65536);

  while pos + 4 < limit {
    if data[pos] != 0xFF {
      pos += 1;
      continue;
    }

    let marker = data[pos + 1];
    if marker == 0xFF {
      pos += 1;
      continue;
    }

    // Markers without length
    if marker == 0x00 || marker == 0x01 || (0xD0..=0xD9).contains(&marker) {
      pos += 2;
      continue;
    }

    let length = u16::from_be_bytes([data[pos + 2], data[pos + 3]]) as usize;

    // SOF0 (baseline) or SOF2 (progressive) contain dimensions
    if marker == 0xC0 || marker == 0xC2 {
      if pos + 9 < data.len() {
        let height = u16::from_be_bytes([data[pos + 5], data[pos + 6]]) as u32;
        let width = u16::from_be_bytes([data[pos + 7], data[pos + 8]]) as u32;
        return Ok((width, height));
      }
    }

    pos += 2 + length;
  }

  Err(ImageError::DecodeError(
    "Could not find JPEG dimensions".to_string(),
  ))
}

/// Fast JPEG decoding using turbojpeg (libjpeg-turbo with SIMD)
/// 2-6x faster than pure Rust decoders thanks to SSE2/AVX2/NEON
#[cfg(feature = "native-codecs")]
#[inline]
pub fn decode_jpeg_fast(data: &[u8]) -> Result<DynamicImage, ImageError> {
  // Use turbojpeg for maximum decode speed
  let image: turbojpeg::Image<Vec<u8>> = turbojpeg::decompress(data, turbojpeg::PixelFormat::RGB)
    .map_err(|e| ImageError::DecodeError(format!("TurboJPEG decode failed: {:?}", e)))?;

  let width = image.width as u32;
  let height = image.height as u32;

  let img = RgbImage::from_raw(width, height, image.pixels)
    .ok_or_else(|| ImageError::DecodeError("Failed to create image from decoded data".to_string()))?;

  Ok(DynamicImage::ImageRgb8(img))
}

// ============================================================
// Pure-Rust JPEG backend (no C dependencies, wasm32-compatible)
// ============================================================

/// Pure-Rust JPEG decode with shrink-on-load *requested* but not available.
///
/// zune-jpeg (the `image` crate's JPEG backend) exposes no scaled-decode API,
/// so this decodes at full resolution and lets the caller's resize step do the
/// downscaling. The returned image is identical in content to the native path;
/// only the decode cost differs. See `docs/guide/wasm.md`.
#[cfg(not(feature = "native-codecs"))]
pub fn decode_jpeg_with_shrink_mode(
  data: &[u8],
  _target_width: Option<u32>,
  _target_height: Option<u32>,
  _fast_mode: bool,
) -> Result<DynamicImage, ImageError> {
  decode_with_image_crate_safe(data)
}

/// Pure-Rust full-resolution JPEG decode via the `image` crate (zune-jpeg).
#[cfg(not(feature = "native-codecs"))]
#[inline]
pub fn decode_jpeg_fast(data: &[u8]) -> Result<DynamicImage, ImageError> {
  decode_with_image_crate_safe(data)
}

#[cfg(test)]
mod tests {
  use super::*;

  /// A 3x2 baseline JPEG, generated at test time so the suite needs no network
  /// and no fixture files (the existing bun suite fetches from picsum.photos).
  fn tiny_jpeg() -> Vec<u8> {
    let img = DynamicImage::ImageRgb8(RgbImage::from_fn(3, 2, |x, y| {
      image::Rgb([(x * 80) as u8, (y * 120) as u8, 200])
    }));
    crate::encode::encode_jpeg(&img, None).expect("encode tiny jpeg")
  }

  #[test]
  fn header_dimensions_match_decoded_dimensions() {
    let data = tiny_jpeg();
    let (w, h) = get_jpeg_dimensions_fast(&data).expect("parse SOF");
    assert_eq!((w, h), (3, 2));

    // The header fast-path must agree with a real decode on both backends.
    let img = decode_jpeg_fast(&data).expect("decode");
    assert_eq!((img.width(), img.height()), (w, h));
  }

  #[test]
  fn shrink_decode_produces_usable_image_on_both_backends() {
    let data = tiny_jpeg();
    // Ask for a downscale. Native shrinks during decode; pure-Rust returns full
    // size. Either way the result must be a valid, non-empty image.
    let img = decode_jpeg_with_shrink_mode(&data, Some(1), Some(1), false).expect("decode");
    assert!(img.width() >= 1 && img.height() >= 1);
    assert!(img.width() <= 3 && img.height() <= 2);
  }

  #[test]
  fn scale_factor_is_conservative_in_normal_mode() {
    // These are pure arithmetic and must behave identically on every backend.
    assert_eq!(calculate_jpeg_scale_factor(800, 600, Some(100), None), (1, 8));
    assert_eq!(calculate_jpeg_scale_factor(800, 600, Some(200), None), (1, 4));
    assert_eq!(calculate_jpeg_scale_factor(800, 600, Some(400), None), (1, 2));
    assert_eq!(calculate_jpeg_scale_factor(800, 600, Some(800), None), (1, 1));
    // No target = full resolution
    assert_eq!(calculate_jpeg_scale_factor(800, 600, None, None), (1, 1));
  }

  #[test]
  fn fast_mode_shrinks_at_least_as_aggressively_as_normal() {
    for target in [50u32, 100, 200, 400, 700] {
      let (_, normal_d) = calculate_jpeg_scale_factor_with_mode(800, 600, Some(target), None, false);
      let (_, fast_d) = calculate_jpeg_scale_factor_with_mode(800, 600, Some(target), None, true);
      assert!(
        fast_d >= normal_d,
        "fast mode must never decode more pixels than normal mode (target {target}: fast 1/{fast_d} vs normal 1/{normal_d})"
      );
    }
  }

  #[test]
  fn rejects_data_that_is_not_a_jpeg() {
    assert!(get_jpeg_dimensions_fast(&[0u8; 64]).is_err());
  }
}
