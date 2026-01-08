//! Utility functions for metadata parsing

use crate::ImageMetadata;

/// Create default metadata for formats without detailed parsing
pub fn create_default_metadata(
  format: &str,
  width: u32,
  height: u32,
  size: u32,
  has_alpha: bool,
  bit_depth: u8,
  channels: u8,
) -> ImageMetadata {
  ImageMetadata {
    width,
    height,
    format: format.to_string(),
    size: Some(size),
    space: if channels == 1 {
      "grayscale".to_string()
    } else {
      "srgb".to_string()
    },
    channels,
    depth: if bit_depth <= 8 {
      "uchar".to_string()
    } else {
      "ushort".to_string()
    },
    has_alpha,
    bits_per_sample: bit_depth,
    is_progressive: false,
    is_palette: false,
    has_profile: false,
    orientation: None,
    pages: None,
    loop_count: None,
    delay: None,
    background: None,
    compression: None,
    density: None,
  }
}

/// Find a chunk in PNG data by type
pub fn find_png_chunk(data: &[u8], chunk_type: &[u8; 4]) -> Option<usize> {
  let mut pos = 8;
  while pos + 12 <= data.len() {
    let length =
      u32::from_be_bytes([data[pos], data[pos + 1], data[pos + 2], data[pos + 3]]) as usize;
    if &data[pos + 4..pos + 8] == chunk_type {
      return Some(pos + 8);
    }
    pos += 12 + length;
  }
  None
}

/// Find a chunk in WebP data by type
pub fn find_webp_chunk(data: &[u8], chunk_type: &[u8; 4]) -> Option<usize> {
  let mut pos = 12;
  while pos + 8 <= data.len() {
    if &data[pos..pos + 4] == chunk_type {
      return Some(pos + 8);
    }
    let length =
      u32::from_le_bytes([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]]) as usize;
    pos += 8 + length + (length & 1);
  }
  None
}

/// Parse EXIF orientation tag from TIFF data
pub fn parse_exif_orientation(data: &[u8]) -> Option<u8> {
  if data.len() < 8 {
    return None;
  }

  let big_endian = &data[0..2] == b"MM";

  let read_u16 = |offset: usize| -> Option<u16> {
    if offset + 2 > data.len() {
      return None;
    }
    Some(if big_endian {
      u16::from_be_bytes([data[offset], data[offset + 1]])
    } else {
      u16::from_le_bytes([data[offset], data[offset + 1]])
    })
  };

  let ifd_offset = if big_endian {
    u32::from_be_bytes([data[4], data[5], data[6], data[7]]) as usize
  } else {
    u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize
  };

  if ifd_offset >= data.len() {
    return None;
  }

  let num_entries = read_u16(ifd_offset)?;

  for i in 0..num_entries.min(20) {
    // Limit to prevent DoS
    let entry_offset = ifd_offset + 2 + (i as usize * 12);
    if entry_offset + 12 > data.len() {
      break;
    }

    let tag = read_u16(entry_offset)?;
    if tag == 0x0112 {
      return Some(read_u16(entry_offset + 8)? as u8);
    }
  }

  None
}
