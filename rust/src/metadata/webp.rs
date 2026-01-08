//! WebP metadata parsing

use crate::ImageMetadata;

use super::utils::find_webp_chunk;

/// Parse WebP header for detailed metadata
pub fn parse_webp_metadata(data: &[u8], width: u32, height: u32, size: u32) -> ImageMetadata {
  let mut has_alpha = false;
  let mut is_animated = false;
  let mut loop_count: Option<u32> = None;
  let mut has_profile = false;

  if data.len() > 20 {
    let chunk = &data[12..16];

    if chunk == b"VP8L" {
      if data.len() > 24 {
        let signature = data[21];
        has_alpha = (signature & 0x10) != 0;
      }
    } else if chunk == b"VP8X" {
      if data.len() > 24 {
        let flags = data[20];
        has_alpha = (flags & 0x10) != 0;
        is_animated = (flags & 0x02) != 0;
        has_profile = (flags & 0x20) != 0;
      }
      if is_animated {
        if let Some(offset) = find_webp_chunk(data, b"ANIM") {
          if data.len() > offset + 6 {
            loop_count = Some(u16::from_le_bytes([data[offset + 4], data[offset + 5]]) as u32);
          }
        }
      }
    }
  }

  let channels = if has_alpha { 4 } else { 3 };

  ImageMetadata {
    width,
    height,
    format: "webp".to_string(),
    size: Some(size),
    space: "srgb".to_string(),
    channels,
    depth: "uchar".to_string(),
    has_alpha,
    bits_per_sample: 8,
    is_progressive: false,
    is_palette: false,
    has_profile,
    orientation: None,
    pages: if is_animated { Some(1) } else { None },
    loop_count,
    delay: None,
    background: None,
    compression: Some("webp".to_string()),
    density: None,
  }
}
