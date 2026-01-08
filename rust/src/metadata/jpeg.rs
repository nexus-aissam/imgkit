//! JPEG metadata parsing - fast header-only extraction

use crate::error::ImageError;
use crate::ImageMetadata;

use super::utils::parse_exif_orientation;

/// Fast JPEG metadata extraction - only reads first few KB of headers
/// Much faster than image crate for large files
pub fn get_jpeg_metadata_fast(data: &[u8], size: u32) -> Result<ImageMetadata, ImageError> {
  let mut width: u32 = 0;
  let mut height: u32 = 0;
  let mut channels: u8 = 3;
  let mut is_progressive = false;
  let mut has_profile = false;
  let mut orientation: Option<u8> = None;
  let mut density: Option<u32> = None;

  // Parse JPEG markers - only scan first 64KB for headers (enough for any reasonable image)
  let scan_limit = data.len().min(65536);
  let mut pos = 2; // Skip SOI marker

  while pos + 4 < scan_limit {
    if data[pos] != 0xFF {
      pos += 1;
      continue;
    }

    let marker = data[pos + 1];

    // Skip padding bytes
    if marker == 0xFF {
      pos += 1;
      continue;
    }

    // Markers without length
    if marker == 0x00 || marker == 0x01 || (0xD0..=0xD9).contains(&marker) {
      pos += 2;
      continue;
    }

    // Get marker length
    if pos + 4 > scan_limit {
      break;
    }
    let length = u16::from_be_bytes([data[pos + 2], data[pos + 3]]) as usize;

    match marker {
      // SOF0 - Baseline DCT (most common)
      0xC0 => {
        if pos + 9 < data.len() {
          height = u16::from_be_bytes([data[pos + 5], data[pos + 6]]) as u32;
          width = u16::from_be_bytes([data[pos + 7], data[pos + 8]]) as u32;
          channels = data[pos + 9];
        }
      }
      // SOF2 - Progressive DCT
      0xC2 => {
        is_progressive = true;
        if pos + 9 < data.len() {
          height = u16::from_be_bytes([data[pos + 5], data[pos + 6]]) as u32;
          width = u16::from_be_bytes([data[pos + 7], data[pos + 8]]) as u32;
          channels = data[pos + 9];
        }
      }
      // APP0 - JFIF (density info)
      0xE0 => {
        if length > 12 && pos + 14 < data.len() {
          if &data[pos + 4..pos + 9] == b"JFIF\0" {
            let unit = data[pos + 11];
            let x_density = u16::from_be_bytes([data[pos + 12], data[pos + 13]]);
            density = Some(match unit {
              1 => x_density as u32,                    // DPI
              2 => (x_density as f64 * 2.54) as u32,    // dots per cm
              _ => x_density as u32,
            });
          }
        }
      }
      // APP1 - EXIF
      0xE1 => {
        if length > 8 && pos + 10 < data.len() {
          if &data[pos + 4..pos + 8] == b"Exif" {
            orientation = parse_exif_orientation(&data[pos + 10..data.len().min(pos + length + 2)]);
          }
        }
      }
      // APP2 - ICC Profile
      0xE2 => {
        if length > 14 && pos + 16 < data.len() {
          if &data[pos + 4..pos + 16] == b"ICC_PROFILE\0" {
            has_profile = true;
          }
        }
      }
      // SOS - Start of scan (we have all headers now)
      0xDA => break,
      _ => {}
    }

    pos += 2 + length;
  }

  // If we didn't find dimensions, something's wrong
  if width == 0 || height == 0 {
    return Err(ImageError::DecodeError(
      "Invalid JPEG: no dimensions found".to_string(),
    ));
  }

  let space = if channels == 1 { "grayscale" } else { "srgb" };

  Ok(ImageMetadata {
    width,
    height,
    format: "jpeg".to_string(),
    size: Some(size),
    space: space.to_string(),
    channels,
    depth: "uchar".to_string(),
    has_alpha: false,
    bits_per_sample: 8,
    is_progressive,
    is_palette: false,
    has_profile,
    orientation,
    pages: None,
    loop_count: None,
    delay: None,
    background: None,
    compression: Some(
      if is_progressive {
        "progressive"
      } else {
        "baseline"
      }
      .to_string(),
    ),
    density,
  })
}
