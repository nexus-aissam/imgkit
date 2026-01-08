//! Image metadata extraction module
//!
//! Provides fast, header-only metadata extraction for various image formats.
//! Optimized for performance - only parses necessary header bytes.

mod gif;
mod heic;
mod jpeg;
mod other;
mod png;
pub mod utils;
mod webp;

use image::ImageFormat;
use std::io::Cursor;

use crate::error::ImageError;
use crate::ImageMetadata;

pub use gif::parse_gif_metadata;
pub use heic::get_heic_metadata;
pub use jpeg::get_jpeg_metadata_fast;
pub use other::{parse_bmp_metadata, parse_ico_metadata, parse_tiff_metadata};
pub use png::parse_png_metadata;
pub use utils::create_default_metadata;
pub use webp::parse_webp_metadata;

/// Check if data is HEIC/HEIF format by examining ftyp box
#[inline]
pub fn is_heic(data: &[u8]) -> bool {
  if data.len() < 12 {
    return false;
  }
  // HEIC/HEIF files start with ftyp box
  // Format: [4 bytes size][4 bytes "ftyp"][4 bytes brand]
  // Common brands: heic, heix, hevc, hevx, mif1, msf1
  if &data[4..8] == b"ftyp" {
    let brand = &data[8..12];
    return brand == b"heic"
      || brand == b"heix"
      || brand == b"hevc"
      || brand == b"hevx"
      || brand == b"mif1"
      || brand == b"msf1"
      || brand == b"avif"; // AVIF is also supported by libheif
  }
  false
}

/// Detect image format from bytes (fast - only reads magic bytes)
#[inline]
pub fn detect_format(data: &[u8]) -> Result<ImageFormat, ImageError> {
  // Check for HEIC first (not detected by image crate)
  if is_heic(data) {
    // Return a placeholder - we'll handle HEIC specially
    return Ok(ImageFormat::Avif); // Use Avif as marker for HEIC (both are similar)
  }

  image::guess_format(data)
    .map_err(|e| ImageError::DecodeError(format!("Cannot detect format: {}", e)))
}

/// Get image metadata WITHOUT fully decoding (reads headers only)
/// Optimized for speed - only parses necessary header bytes
pub fn get_metadata(data: &[u8]) -> Result<ImageMetadata, ImageError> {
  let size = data.len() as u32;

  // Check for HEIC first
  if is_heic(data) {
    return get_heic_metadata(data, size);
  }

  let format = detect_format(data)?;

  // For JPEG, use fast header-only parsing
  if matches!(format, ImageFormat::Jpeg) {
    return get_jpeg_metadata_fast(data, size);
  }

  // For other formats, use image crate's header reading
  let cursor = Cursor::new(data);
  let reader = image::ImageReader::new(cursor)
    .with_guessed_format()
    .map_err(|e| ImageError::DecodeError(e.to_string()))?;

  let (width, height) = reader
    .into_dimensions()
    .map_err(|e| ImageError::DecodeError(e.to_string()))?;

  let metadata = match format {
    ImageFormat::Png => parse_png_metadata(data, width, height, size),
    ImageFormat::WebP => parse_webp_metadata(data, width, height, size),
    ImageFormat::Gif => parse_gif_metadata(data, width, height, size),
    ImageFormat::Bmp => parse_bmp_metadata(data, width, height, size),
    ImageFormat::Tiff => parse_tiff_metadata(data, width, height, size),
    ImageFormat::Ico => parse_ico_metadata(data, width, height, size),
    _ => create_default_metadata("unknown", width, height, size, false, 8, 3),
  };

  Ok(metadata)
}
