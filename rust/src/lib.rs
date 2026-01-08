//! bun-image-turbo - High-performance image processing for Bun and Node.js
//!
//! Built with Rust for maximum performance.

use napi::bindgen_prelude::*;
use napi_derive::napi;

// Internal modules
mod decode;
mod encode;
mod error;
mod metadata;
mod metadata_write;
mod resize;
mod transform;

// Public types module
pub mod types;
pub use types::*;

use error::ImageError;

// ============================================
// SYNC FUNCTIONS
// ============================================

/// Get image metadata synchronously
#[napi]
pub fn metadata_sync(input: Buffer) -> Result<ImageMetadata> {
  decode::get_metadata(&input).map_err(|e| e.into())
}

/// Resize image synchronously - uses scale-on-decode for JPEG optimization
#[napi]
pub fn resize_sync(input: Buffer, options: ResizeOptions) -> Result<Buffer> {
  // Use scale-on-decode for JPEG images - massive speedup for large images
  let img = decode::decode_image_with_target(&input, options.width, options.height)?;
  let resized = resize::resize_image(img, &options)?;

  // Default to PNG for resize output
  let output = encode::encode_png(&resized, None)?;
  Ok(Buffer::from(output))
}

/// Convert image to JPEG synchronously
#[napi]
pub fn to_jpeg_sync(input: Buffer, options: Option<JpegOptions>) -> Result<Buffer> {
  let img = decode::decode_image(&input)?;
  let output = encode::encode_jpeg(&img, options.as_ref())?;
  Ok(Buffer::from(output))
}

/// Convert image to PNG synchronously
#[napi]
pub fn to_png_sync(input: Buffer, options: Option<PngOptions>) -> Result<Buffer> {
  let img = decode::decode_image(&input)?;
  let output = encode::encode_png(&img, options.as_ref())?;
  Ok(Buffer::from(output))
}

/// Convert image to WebP synchronously
#[napi]
pub fn to_webp_sync(input: Buffer, options: Option<WebPOptions>) -> Result<Buffer> {
  let img = decode::decode_image(&input)?;
  let output = encode::encode_webp(&img, options.as_ref())?;
  Ok(Buffer::from(output))
}

/// Transform image with multiple operations synchronously
#[napi]
pub fn transform_sync(input: Buffer, options: TransformOptions) -> Result<Buffer> {
  transform::transform_image(&input, &options).map_err(|e| e.into())
}

/// Generate blurhash from image synchronously
#[napi]
pub fn blurhash_sync(input: Buffer, components_x: Option<u32>, components_y: Option<u32>) -> Result<BlurHashResult> {
  let img = decode::decode_image(&input)?;
  let cx = components_x.unwrap_or(4) as u32;
  let cy = components_y.unwrap_or(3) as u32;

  let rgba = img.to_rgba8();
  let (w, h) = image::GenericImageView::dimensions(&rgba);

  let hash = blurhash::encode(cx, cy, w, h, rgba.as_raw())
    .map_err(|e| Error::from_reason(format!("Blurhash error: {}", e)))?;

  Ok(BlurHashResult {
    hash,
    width: w,
    height: h,
  })
}

// ============================================
// ASYNC FUNCTIONS
// ============================================

/// Get image metadata asynchronously
#[napi]
pub async fn metadata(input: Buffer) -> Result<ImageMetadata> {
  tokio::task::spawn_blocking(move || {
    decode::get_metadata(&input)
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Resize image asynchronously - uses scale-on-decode for JPEG optimization
#[napi]
pub async fn resize(input: Buffer, options: ResizeOptions) -> Result<Buffer> {
  tokio::task::spawn_blocking(move || {
    // Use scale-on-decode for JPEG images - massive speedup for large images
    let img = decode::decode_image_with_target(&input, options.width, options.height)?;
    let resized = resize::resize_image(img, &options)?;
    let output = encode::encode_png(&resized, None)?;
    Ok::<Buffer, ImageError>(Buffer::from(output))
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Convert image to JPEG asynchronously
#[napi]
pub async fn to_jpeg(input: Buffer, options: Option<JpegOptions>) -> Result<Buffer> {
  tokio::task::spawn_blocking(move || {
    let img = decode::decode_image(&input)?;
    let output = encode::encode_jpeg(&img, options.as_ref())?;
    Ok::<Buffer, ImageError>(Buffer::from(output))
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Convert image to PNG asynchronously
#[napi]
pub async fn to_png(input: Buffer, options: Option<PngOptions>) -> Result<Buffer> {
  tokio::task::spawn_blocking(move || {
    let img = decode::decode_image(&input)?;
    let output = encode::encode_png(&img, options.as_ref())?;
    Ok::<Buffer, ImageError>(Buffer::from(output))
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Convert image to WebP asynchronously
#[napi]
pub async fn to_webp(input: Buffer, options: Option<WebPOptions>) -> Result<Buffer> {
  tokio::task::spawn_blocking(move || {
    let img = decode::decode_image(&input)?;
    let output = encode::encode_webp(&img, options.as_ref())?;
    Ok::<Buffer, ImageError>(Buffer::from(output))
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Transform image with multiple operations asynchronously
#[napi]
pub async fn transform(input: Buffer, options: TransformOptions) -> Result<Buffer> {
  tokio::task::spawn_blocking(move || {
    transform::transform_image(&input, &options)
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Generate blurhash from image asynchronously
#[napi]
pub async fn blurhash(input: Buffer, components_x: Option<u32>, components_y: Option<u32>) -> Result<BlurHashResult> {
  tokio::task::spawn_blocking(move || {
    let img = decode::decode_image(&input)?;
    let cx = components_x.unwrap_or(4) as u32;
    let cy = components_y.unwrap_or(3) as u32;

    let rgba = img.to_rgba8();
    let (w, h) = image::GenericImageView::dimensions(&rgba);

    let hash = blurhash::encode(cx, cy, w, h, rgba.as_raw())
      .map_err(|e| ImageError::ProcessingError(format!("Blurhash error: {}", e)))?;

    Ok::<BlurHashResult, ImageError>(BlurHashResult {
      hash,
      width: w,
      height: h,
    })
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Get library version
#[napi]
pub fn version() -> String {
  env!("CARGO_PKG_VERSION").to_string()
}

// ============================================
// EXIF/METADATA WRITE FUNCTIONS
// ============================================

/// Convert ExifOptions to internal ExifWriteOptions
fn exif_options_to_internal(options: &ExifOptions) -> metadata_write::ExifWriteOptions {
  metadata_write::ExifWriteOptions {
    image_description: options.image_description.clone(),
    artist: options.artist.clone(),
    copyright: options.copyright.clone(),
    software: options.software.clone(),
    date_time: options.date_time.clone(),
    date_time_original: options.date_time_original.clone(),
    user_comment: options.user_comment.clone(),
    make: options.make.clone(),
    model: options.model.clone(),
    orientation: options.orientation,
  }
}

/// Write EXIF metadata to a WebP image synchronously
#[napi]
pub fn write_exif_sync(input: Buffer, options: ExifOptions) -> Result<Buffer> {
  let format = decode::detect_format(&input)?;
  let internal_opts = exif_options_to_internal(&options);

  let output = match format {
    image::ImageFormat::Jpeg => metadata_write::write_jpeg_exif(&input, &internal_opts)?,
    image::ImageFormat::WebP => metadata_write::write_webp_exif(&input, &internal_opts)?,
    _ => return Err(Error::from_reason("EXIF writing only supported for JPEG and WebP formats")),
  };

  Ok(Buffer::from(output))
}

/// Write EXIF metadata to a WebP image asynchronously
#[napi]
pub async fn write_exif(input: Buffer, options: ExifOptions) -> Result<Buffer> {
  tokio::task::spawn_blocking(move || {
    let format = decode::detect_format(&input)?;
    let internal_opts = exif_options_to_internal(&options);

    let output = match format {
      image::ImageFormat::Jpeg => metadata_write::write_jpeg_exif(&input, &internal_opts)?,
      image::ImageFormat::WebP => metadata_write::write_webp_exif(&input, &internal_opts)?,
      _ => return Err(ImageError::UnsupportedFormat("EXIF writing only supported for JPEG and WebP formats".to_string())),
    };

    Ok::<Buffer, ImageError>(Buffer::from(output))
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}

/// Strip EXIF metadata from an image synchronously
#[napi]
pub fn strip_exif_sync(input: Buffer) -> Result<Buffer> {
  let format = decode::detect_format(&input)?;

  let output = match format {
    image::ImageFormat::Jpeg => metadata_write::strip_jpeg_exif(&input)?,
    image::ImageFormat::WebP => metadata_write::strip_webp_exif(&input)?,
    _ => return Err(Error::from_reason("EXIF stripping only supported for JPEG and WebP formats")),
  };

  Ok(Buffer::from(output))
}

/// Strip EXIF metadata from an image asynchronously
#[napi]
pub async fn strip_exif(input: Buffer) -> Result<Buffer> {
  tokio::task::spawn_blocking(move || {
    let format = decode::detect_format(&input)?;

    let output = match format {
      image::ImageFormat::Jpeg => metadata_write::strip_jpeg_exif(&input)?,
      image::ImageFormat::WebP => metadata_write::strip_webp_exif(&input)?,
      _ => return Err(ImageError::UnsupportedFormat("EXIF stripping only supported for JPEG and WebP formats".to_string())),
    };

    Ok::<Buffer, ImageError>(Buffer::from(output))
  })
  .await
  .map_err(|e| Error::from_reason(format!("Task error: {}", e)))?
  .map_err(|e| e.into())
}
