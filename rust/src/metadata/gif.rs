//! GIF metadata parsing

use crate::ImageMetadata;

/// Parse GIF header for detailed metadata
pub fn parse_gif_metadata(data: &[u8], width: u32, height: u32, size: u32) -> ImageMetadata {
  let mut background: Option<Vec<u8>> = None;
  let mut pages: u32 = 0;
  let loop_count: Option<u32> = None;
  let mut delays: Vec<u32> = Vec::new();

  if data.len() > 13 {
    let flags = data[10];
    let has_gct = (flags & 0x80) != 0;
    let bg_index = data[11] as usize;

    if has_gct {
      let gct_start = 13;
      if data.len() > gct_start + bg_index * 3 + 2 {
        let bg_offset = gct_start + bg_index * 3;
        background = Some(vec![
          data[bg_offset],
          data[bg_offset + 1],
          data[bg_offset + 2],
        ]);
      }
    }
  }

  // Simplified frame counting - just count image descriptors
  let mut pos = 13;
  if data.len() > 13 {
    let flags = data[10];
    if (flags & 0x80) != 0 {
      pos += 3 * (1 << ((flags & 0x07) + 1));
    }
  }

  // Only scan first 64KB for frame info
  let scan_limit = data.len().min(65536);
  while pos < scan_limit {
    match data.get(pos) {
      Some(0x2C) => {
        pages += 1;
        pos += 10;
      }
      Some(0x21) => {
        if let Some(&ext_type) = data.get(pos + 1) {
          if ext_type == 0xF9 && pos + 5 < data.len() {
            let delay = u16::from_le_bytes([data[pos + 4], data[pos + 5]]) as u32 * 10;
            delays.push(delay);
          }
        }
        pos += 2;
        while pos < data.len() && data[pos] != 0 {
          pos += data[pos] as usize + 1;
        }
        pos += 1;
      }
      Some(0x3B) => break,
      _ => pos += 1,
    }
  }

  ImageMetadata {
    width,
    height,
    format: "gif".to_string(),
    size: Some(size),
    space: "srgb".to_string(),
    channels: 4,
    depth: "uchar".to_string(),
    has_alpha: true,
    bits_per_sample: 8,
    is_progressive: false,
    is_palette: true,
    has_profile: false,
    orientation: None,
    pages: Some(pages.max(1)),
    loop_count,
    delay: if delays.is_empty() { None } else { Some(delays) },
    background,
    compression: Some("lzw".to_string()),
    density: None,
  }
}
