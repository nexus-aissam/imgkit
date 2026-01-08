//! PNG metadata parsing

use crate::ImageMetadata;

use super::utils::{create_default_metadata, find_png_chunk};

/// Parse PNG header for detailed metadata
pub fn parse_png_metadata(data: &[u8], width: u32, height: u32, size: u32) -> ImageMetadata {
  if data.len() < 29 {
    return create_default_metadata("png", width, height, size, false, 8, 3);
  }

  // Check PNG signature
  if &data[0..8] != b"\x89PNG\r\n\x1a\n" {
    return create_default_metadata("png", width, height, size, false, 8, 3);
  }

  // IHDR should be first chunk
  if &data[12..16] != b"IHDR" {
    return create_default_metadata("png", width, height, size, false, 8, 3);
  }

  let bit_depth = data[24];
  let color_type = data[25];
  let interlace = data[28];

  let (has_alpha, channels, space, is_palette) = match color_type {
    0 => (false, 1, "grayscale", false),
    2 => (false, 3, "srgb", false),
    3 => (false, 1, "srgb", true),
    4 => (true, 2, "grayscale", false),
    6 => (true, 4, "srgb", false),
    _ => (false, 3, "srgb", false),
  };

  let has_profile = find_png_chunk(data, b"iCCP").is_some();
  let density = find_png_chunk(data, b"pHYs").and_then(|offset| {
    if data.len() > offset + 12 {
      let ppu_x = u32::from_be_bytes([
        data[offset],
        data[offset + 1],
        data[offset + 2],
        data[offset + 3],
      ]);
      let unit = data[offset + 8];
      if unit == 1 {
        Some((ppu_x as f64 / 39.3701) as u32)
      } else {
        None
      }
    } else {
      None
    }
  });

  let depth_str = match bit_depth {
    1 | 2 | 4 | 8 => "uchar",
    16 => "ushort",
    _ => "uchar",
  };

  ImageMetadata {
    width,
    height,
    format: "png".to_string(),
    size: Some(size),
    space: space.to_string(),
    channels,
    depth: depth_str.to_string(),
    has_alpha,
    bits_per_sample: bit_depth,
    is_progressive: interlace == 1,
    is_palette,
    has_profile,
    orientation: None,
    pages: None,
    loop_count: None,
    delay: None,
    background: None,
    compression: Some("deflate".to_string()),
    density,
  }
}
