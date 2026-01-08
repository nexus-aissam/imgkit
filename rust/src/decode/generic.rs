//! Generic image decoding fallback
//!
//! Uses the image crate for formats without specialized decoders.
//! Includes memory protection for huge images.

use image::{DynamicImage, ImageReader};
use std::io::Cursor;

use crate::error::ImageError;

/// Maximum pixel count before we require memory protection (100 megapixels)
const MAX_PIXELS_DEFAULT: u64 = 100_000_000;

/// Fallback decoder using image crate for non-JPEG formats
/// Includes memory protection for huge images
#[inline]
pub fn decode_with_image_crate_safe(data: &[u8]) -> Result<DynamicImage, ImageError> {
  let cursor = Cursor::new(data);
  let reader = ImageReader::new(cursor)
    .with_guessed_format()
    .map_err(|e| ImageError::DecodeError(e.to_string()))?;

  // Check dimensions before decoding to prevent memory exhaustion
  let (width, height) = reader
    .into_dimensions()
    .map_err(|e| ImageError::DecodeError(e.to_string()))?;

  let pixel_count = width as u64 * height as u64;
  if pixel_count > MAX_PIXELS_DEFAULT {
    return Err(ImageError::DecodeError(format!(
      "Image too large: {}x{} ({} megapixels) exceeds limit of {} megapixels",
      width,
      height,
      pixel_count / 1_000_000,
      MAX_PIXELS_DEFAULT / 1_000_000
    )));
  }

  // Re-read and decode (into_dimensions consumes the reader)
  let cursor = Cursor::new(data);
  let reader = ImageReader::new(cursor)
    .with_guessed_format()
    .map_err(|e| ImageError::DecodeError(e.to_string()))?;

  reader
    .decode()
    .map_err(|e| ImageError::DecodeError(e.to_string()))
}
