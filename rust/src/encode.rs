//! Image encoding functions - optimized for performance
//! Uses jpeg-encoder for faster JPEG encoding

use image::{DynamicImage, GenericImageView, ImageEncoder, ExtendedColorType};
use image::codecs::png::{PngEncoder, CompressionType, FilterType};
use jpeg_encoder::{Encoder as JpegEncoderFast, ColorType as JpegColorType};

use crate::error::ImageError;
use crate::{JpegOptions, PngOptions, WebPOptions};

/// Estimate output buffer size based on input dimensions
#[inline]
fn estimate_jpeg_size(width: u32, height: u32, quality: u8) -> usize {
  // JPEG typically compresses to 5-15% of raw size at quality 80
  let raw_size = (width as usize) * (height as usize) * 3;
  let compression_ratio = if quality > 90 { 0.3 } else if quality > 70 { 0.15 } else { 0.1 };
  ((raw_size as f64) * compression_ratio) as usize + 1024
}

/// Encode image to JPEG - optimized using jpeg-encoder
pub fn encode_jpeg(img: &DynamicImage, options: Option<&JpegOptions>) -> Result<Vec<u8>, ImageError> {
  let quality = options.and_then(|o| o.quality).unwrap_or(80);
  let quality = quality.clamp(1, 100);

  let rgb = img.to_rgb8();
  let (width, height) = (rgb.width(), rgb.height());

  // Use jpeg-encoder which is faster than image crate's encoder
  let mut output: Vec<u8> = Vec::with_capacity(estimate_jpeg_size(width, height, quality));
  let encoder = JpegEncoderFast::new(&mut output, quality);

  encoder.encode(rgb.as_raw(), width as u16, height as u16, JpegColorType::Rgb)
    .map_err(|e| ImageError::EncodeError(format!("JPEG encode failed: {}", e)))?;

  Ok(output)
}

/// Encode image to PNG - optimized
/// Uses RGB when no alpha channel present (25% less data to process)
pub fn encode_png(img: &DynamicImage, options: Option<&PngOptions>) -> Result<Vec<u8>, ImageError> {
  let compression = options.and_then(|o| o.compression).unwrap_or(6);

  // Compression type based on level
  let compression_type = match compression {
    0 => CompressionType::Fast,
    1..=3 => CompressionType::Fast,
    4..=6 => CompressionType::Default,
    _ => CompressionType::Best,
  };

  // Use Sub filter for speed - it's faster than Adaptive with similar results
  // for photographic content. Adaptive is only better for specific patterns.
  let filter_type = if compression < 4 {
    FilterType::Sub
  } else {
    FilterType::Adaptive
  };

  // Check if image has alpha - use RGB if not (faster encoding)
  let has_alpha = img.color().has_alpha();

  // Pre-allocate buffer
  let (width, height) = img.dimensions();
  let raw_size = (width as usize) * (height as usize) * if has_alpha { 4 } else { 3 };
  let mut output: Vec<u8> = Vec::with_capacity(raw_size / 2); // PNG typically compresses well

  if has_alpha {
    let rgba = img.to_rgba8();
    let encoder = PngEncoder::new_with_quality(&mut output, compression_type, filter_type);
    encoder.write_image(&rgba, width, height, ExtendedColorType::Rgba8)
      .map_err(|e| ImageError::EncodeError(format!("PNG encode failed: {}", e)))?;
  } else {
    let rgb = img.to_rgb8();
    let encoder = PngEncoder::new_with_quality(&mut output, compression_type, filter_type);
    encoder.write_image(&rgb, width, height, ExtendedColorType::Rgb8)
      .map_err(|e| ImageError::EncodeError(format!("PNG encode failed: {}", e)))?;
  }

  Ok(output)
}

/// Encode image to WebP - already optimized (uses libwebp)
pub fn encode_webp(img: &DynamicImage, options: Option<&WebPOptions>) -> Result<Vec<u8>, ImageError> {
  let quality = options.and_then(|o| o.quality).unwrap_or(80) as f32;
  let lossless = options.and_then(|o| o.lossless).unwrap_or(false);

  // Check if alpha is needed
  let has_alpha = img.color().has_alpha();

  let webp_data = if has_alpha {
    let rgba = img.to_rgba8();
    let (width, height) = (rgba.width(), rgba.height());
    let encoder = webp::Encoder::from_rgba(&rgba, width, height);
    if lossless {
      encoder.encode_lossless()
    } else {
      encoder.encode(quality)
    }
  } else {
    // Use RGB path for non-alpha images (faster)
    let rgb = img.to_rgb8();
    let (width, height) = (rgb.width(), rgb.height());
    let encoder = webp::Encoder::from_rgb(&rgb, width, height);
    if lossless {
      encoder.encode_lossless()
    } else {
      encoder.encode(quality)
    }
  };

  Ok(webp_data.to_vec())
}

/// Encode image to specified format based on OutputOptions
pub fn encode_to_format(
  img: &DynamicImage,
  format: &crate::ImageFormat,
  jpeg_opts: Option<&JpegOptions>,
  png_opts: Option<&PngOptions>,
  webp_opts: Option<&WebPOptions>,
) -> Result<Vec<u8>, ImageError> {
  match format {
    crate::ImageFormat::Jpeg => encode_jpeg(img, jpeg_opts),
    crate::ImageFormat::Png => encode_png(img, png_opts),
    crate::ImageFormat::WebP => encode_webp(img, webp_opts),
    crate::ImageFormat::Gif => {
      // Use image crate's GIF encoder
      let rgba = img.to_rgba8();
      let mut output: Vec<u8> = Vec::new();
      {
        let mut encoder = image::codecs::gif::GifEncoder::new(&mut output);
        let frame = image::Frame::new(rgba);
        encoder.encode_frames(std::iter::once(frame))
          .map_err(|e| ImageError::EncodeError(format!("GIF encode failed: {}", e)))?;
      }
      Ok(output)
    }
    crate::ImageFormat::Bmp => {
      let rgb = img.to_rgb8();
      let (width, height) = (rgb.width(), rgb.height());
      let mut output: Vec<u8> = Vec::new();
      let encoder = image::codecs::bmp::BmpEncoder::new(&mut output);
      encoder.write_image(&rgb, width, height, ExtendedColorType::Rgb8)
        .map_err(|e| ImageError::EncodeError(format!("BMP encode failed: {}", e)))?;
      Ok(output)
    }
    crate::ImageFormat::Ico => {
      Err(ImageError::UnsupportedFormat("ICO encoding not supported".to_string()))
    }
    crate::ImageFormat::Tiff => {
      Err(ImageError::UnsupportedFormat("TIFF encoding not supported in this context".to_string()))
    }
  }
}
