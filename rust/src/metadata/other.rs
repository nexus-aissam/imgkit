//! Metadata parsing for BMP, TIFF, and ICO formats

use crate::ImageMetadata;

use super::utils::create_default_metadata;

/// Parse BMP header
pub fn parse_bmp_metadata(data: &[u8], width: u32, height: u32, size: u32) -> ImageMetadata {
  let mut bit_depth: u8 = 24;
  let mut has_alpha = false;
  let mut compression = "none";

  if data.len() > 28 {
    bit_depth = u16::from_le_bytes([data[28], data[29]]) as u8;
    has_alpha = bit_depth == 32;

    if data.len() > 34 {
      let comp = u32::from_le_bytes([data[30], data[31], data[32], data[33]]);
      compression = match comp {
        0 => "none",
        1 => "rle8",
        2 => "rle4",
        3 => "bitfields",
        _ => "unknown",
      };
    }
  }

  let channels = if has_alpha { 4 } else { 3 };

  ImageMetadata {
    width,
    height,
    format: "bmp".to_string(),
    size: Some(size),
    space: "srgb".to_string(),
    channels,
    depth: "uchar".to_string(),
    has_alpha,
    bits_per_sample: bit_depth.min(8),
    is_progressive: false,
    is_palette: bit_depth <= 8,
    has_profile: false,
    orientation: None,
    pages: None,
    loop_count: None,
    delay: None,
    background: None,
    compression: Some(compression.to_string()),
    density: None,
  }
}

/// Parse TIFF metadata (basic implementation)
pub fn parse_tiff_metadata(_data: &[u8], width: u32, height: u32, size: u32) -> ImageMetadata {
  create_default_metadata("tiff", width, height, size, false, 8, 3)
}

/// Parse ICO metadata
pub fn parse_ico_metadata(data: &[u8], width: u32, height: u32, size: u32) -> ImageMetadata {
  let pages = if data.len() > 5 {
    Some(u16::from_le_bytes([data[4], data[5]]) as u32)
  } else {
    None
  };

  ImageMetadata {
    width,
    height,
    format: "ico".to_string(),
    size: Some(size),
    space: "srgb".to_string(),
    channels: 4,
    depth: "uchar".to_string(),
    has_alpha: true,
    bits_per_sample: 8,
    is_progressive: false,
    is_palette: false,
    has_profile: false,
    orientation: None,
    pages,
    loop_count: None,
    delay: None,
    background: None,
    compression: None,
    density: None,
  }
}
