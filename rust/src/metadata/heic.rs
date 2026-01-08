//! HEIC/HEIF metadata parsing using libheif

use crate::error::ImageError;
use crate::ImageMetadata;

/// Get HEIC/HEIF metadata using libheif (fast - header only)
#[cfg(feature = "heic")]
pub fn get_heic_metadata(data: &[u8], size: u32) -> Result<ImageMetadata, ImageError> {
  use libheif_rs::HeifContext;

  let ctx = HeifContext::read_from_bytes(data)
    .map_err(|e| ImageError::DecodeError(format!("HEIC context error: {}", e)))?;

  let handle = ctx
    .primary_image_handle()
    .map_err(|e| ImageError::DecodeError(format!("HEIC handle error: {}", e)))?;

  let width = handle.width();
  let height = handle.height();
  let has_alpha = handle.has_alpha_channel();
  let bit_depth = handle.luma_bits_per_pixel();

  // Determine format string (heic or avif)
  let format_str = if data.len() >= 12 && &data[8..12] == b"avif" {
    "avif"
  } else {
    "heic"
  };

  let channels = if has_alpha { 4 } else { 3 };

  Ok(ImageMetadata {
    width,
    height,
    format: format_str.to_string(),
    size: Some(size),
    space: "srgb".to_string(),
    channels,
    depth: if bit_depth > 8 {
      "ushort".to_string()
    } else {
      "uchar".to_string()
    },
    has_alpha,
    bits_per_sample: bit_depth,
    is_progressive: false,
    is_palette: false,
    has_profile: handle.color_profile_raw().is_some(),
    orientation: None, // HEIC handles orientation internally
    pages: None,
    loop_count: None,
    delay: None,
    background: None,
    compression: Some("hevc".to_string()),
    density: None,
  })
}

/// Placeholder when HEIC feature is not enabled
#[cfg(not(feature = "heic"))]
pub fn get_heic_metadata(_data: &[u8], _size: u32) -> Result<ImageMetadata, ImageError> {
  Err(ImageError::UnsupportedFormat(
    "HEIC/HEIF support not available. Install with 'heic' feature enabled.".to_string(),
  ))
}
