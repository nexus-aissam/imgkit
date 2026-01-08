//! Type definitions for bun-image-turbo
//!
//! All NAPI-compatible types (enums, structs) for the public API.

use napi_derive::napi;

/// Image format enum
#[napi(string_enum)]
pub enum ImageFormat {
  Jpeg,
  Png,
  WebP,
  Gif,
  Bmp,
  Ico,
  Tiff,
  Heic,
  Avif,
}

/// Resize filter/algorithm
#[napi(string_enum)]
pub enum ResizeFilter {
  /// Nearest neighbor - fastest, lowest quality
  Nearest,
  /// Bilinear - fast, good quality
  Bilinear,
  /// Catmull-Rom - balanced speed and quality
  CatmullRom,
  /// Mitchell - good for downscaling
  Mitchell,
  /// Lanczos3 - highest quality, slower
  Lanczos3,
}

/// Image fit mode for resize
#[napi(string_enum)]
pub enum FitMode {
  /// Resize to cover the target dimensions (may crop)
  Cover,
  /// Resize to fit within target dimensions (may have padding)
  Contain,
  /// Resize to exact dimensions (may distort)
  Fill,
  /// Resize only if larger than target
  Inside,
  /// Resize only if smaller than target
  Outside,
}

/// Resize options
#[napi(object)]
#[derive(Clone)]
pub struct ResizeOptions {
  /// Target width (optional if height is provided)
  pub width: Option<u32>,
  /// Target height (optional if width is provided)
  pub height: Option<u32>,
  /// Resize filter/algorithm (default: Lanczos3)
  pub filter: Option<ResizeFilter>,
  /// Fit mode (default: Cover)
  pub fit: Option<FitMode>,
  /// Background color for padding [r, g, b, a] (default: transparent)
  pub background: Option<Vec<u8>>,
}

/// JPEG encode options
#[napi(object)]
#[derive(Clone)]
pub struct JpegOptions {
  /// Quality 1-100 (default: 80)
  pub quality: Option<u8>,
}

/// PNG encode options
#[napi(object)]
#[derive(Clone)]
pub struct PngOptions {
  /// Compression level 0-9 (default: 6)
  pub compression: Option<u8>,
}

/// WebP encode options
#[napi(object)]
#[derive(Clone)]
pub struct WebPOptions {
  /// Quality 1-100 for lossy, ignored for lossless (default: 80)
  pub quality: Option<u8>,
  /// Use lossless compression (default: false)
  pub lossless: Option<bool>,
}

/// Output format options
#[napi(object)]
#[derive(Clone)]
pub struct OutputOptions {
  /// Output format
  pub format: ImageFormat,
  /// JPEG options (if format is JPEG)
  pub jpeg: Option<JpegOptions>,
  /// PNG options (if format is PNG)
  pub png: Option<PngOptions>,
  /// WebP options (if format is WebP)
  pub webp: Option<WebPOptions>,
}

/// Image metadata (similar to sharp's output)
#[napi(object)]
pub struct ImageMetadata {
  /// Image width in pixels
  pub width: u32,
  /// Image height in pixels
  pub height: u32,
  /// Detected format (jpeg, png, webp, gif, bmp, ico, tiff)
  pub format: String,
  /// File size in bytes (if available)
  pub size: Option<u32>,
  /// Color space (srgb, rgb, grayscale)
  pub space: String,
  /// Number of channels (1, 2, 3, or 4)
  pub channels: u8,
  /// Bit depth per sample (uchar = 8-bit)
  pub depth: String,
  /// Whether the image has an alpha channel
  pub has_alpha: bool,
  /// Bits per sample
  pub bits_per_sample: u8,
  /// Whether the image is progressive (JPEG) or interlaced (PNG)
  pub is_progressive: bool,
  /// Whether the image uses palette/indexed colors (PNG/GIF)
  pub is_palette: bool,
  /// Whether the image has an embedded ICC profile
  pub has_profile: bool,
  /// EXIF orientation value (1-8, if present)
  pub orientation: Option<u8>,
  /// Page/frame count for multi-page images (GIF, TIFF)
  pub pages: Option<u32>,
  /// Loop count for animated images
  pub loop_count: Option<u32>,
  /// Delay between frames in ms (for animated images)
  pub delay: Option<Vec<u32>>,
  /// Background color (for GIF)
  pub background: Option<Vec<u8>>,
  /// Compression type used
  pub compression: Option<String>,
  /// Density/DPI info
  pub density: Option<u32>,
}

/// Raw hash result for blurhash
#[napi(object)]
pub struct BlurHashResult {
  /// The blurhash string
  pub hash: String,
  /// Original width
  pub width: u32,
  /// Original height
  pub height: u32,
}

/// Transform options (all-in-one processing)
#[napi(object)]
#[derive(Clone)]
pub struct TransformOptions {
  /// Resize options
  pub resize: Option<ResizeOptions>,
  /// Output options
  pub output: Option<OutputOptions>,
  /// Rotate degrees (90, 180, 270)
  pub rotate: Option<i32>,
  /// Flip horizontally
  pub flip_h: Option<bool>,
  /// Flip vertically
  pub flip_v: Option<bool>,
  /// Grayscale conversion
  pub grayscale: Option<bool>,
  /// Blur radius (0-100) - use integer, will be converted to float internally
  pub blur: Option<u32>,
  /// Sharpen amount (0-100) - use integer, will be converted to float internally
  pub sharpen: Option<u32>,
  /// Brightness adjustment (-100 to 100)
  pub brightness: Option<i32>,
  /// Contrast adjustment (-100 to 100)
  pub contrast: Option<i32>,
  /// EXIF metadata to write (for JPEG/WebP output)
  pub exif: Option<ExifOptions>,
}

/// EXIF metadata options for writing
#[napi(object)]
#[derive(Clone)]
pub struct ExifOptions {
  /// Image description / caption / AI prompt
  pub image_description: Option<String>,
  /// Artist / creator name
  pub artist: Option<String>,
  /// Copyright notice
  pub copyright: Option<String>,
  /// Software used to create the image
  pub software: Option<String>,
  /// Date/time in EXIF format (YYYY:MM:DD HH:MM:SS)
  pub date_time: Option<String>,
  /// Original date/time in EXIF format
  pub date_time_original: Option<String>,
  /// User comment (can contain JSON or other data)
  pub user_comment: Option<String>,
  /// Camera/device make
  pub make: Option<String>,
  /// Camera/device model
  pub model: Option<String>,
  /// Orientation (1-8)
  pub orientation: Option<u16>,
}
