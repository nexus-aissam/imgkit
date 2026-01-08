//! Image resizing functions - optimized for performance
//! Uses adaptive algorithm selection based on scale factor

use image::{DynamicImage, GenericImageView, RgbaImage, RgbImage};
use fast_image_resize::{self as fr, PixelType, ResizeAlg, ResizeOptions as FrResizeOptions, MulDiv};

use crate::error::ImageError;
use crate::{ResizeOptions, ResizeFilter, FitMode};

/// Get the optimal resize algorithm based on filter preference and scale factor
/// For large downscales, uses a faster algorithm first, then refines
#[inline]
fn get_resize_algorithm(filter: &Option<ResizeFilter>, scale_factor: f64) -> ResizeAlg {
  match filter {
    Some(ResizeFilter::Nearest) => ResizeAlg::Nearest,
    Some(ResizeFilter::Bilinear) => ResizeAlg::Convolution(fr::FilterType::Bilinear),
    Some(ResizeFilter::CatmullRom) => ResizeAlg::Convolution(fr::FilterType::CatmullRom),
    Some(ResizeFilter::Mitchell) => ResizeAlg::Convolution(fr::FilterType::Mitchell),
    Some(ResizeFilter::Lanczos3) => ResizeAlg::Convolution(fr::FilterType::Lanczos3),
    None => {
      // Adaptive algorithm selection based on scale factor
      // This matches libvips behavior for speed vs quality tradeoff
      if scale_factor < 0.25 {
        // For > 4x downscale, use Box (fastest, good for shrinking)
        ResizeAlg::Convolution(fr::FilterType::Box)
      } else if scale_factor < 0.5 {
        // For 2-4x downscale, use Bilinear (fast, acceptable quality)
        ResizeAlg::Convolution(fr::FilterType::Bilinear)
      } else if scale_factor < 0.75 {
        // For 1.33-2x downscale, use CatmullRom (fast, good quality)
        ResizeAlg::Convolution(fr::FilterType::CatmullRom)
      } else {
        // For small scale changes (<1.33x), use Lanczos3 (best quality)
        ResizeAlg::Convolution(fr::FilterType::Lanczos3)
      }
    }
  }
}

/// Calculate target dimensions based on fit mode
#[inline]
fn calculate_dimensions(
  src_width: u32,
  src_height: u32,
  target_width: Option<u32>,
  target_height: Option<u32>,
  fit: &Option<FitMode>,
) -> Result<(u32, u32), ImageError> {
  let fit_mode = fit.clone().unwrap_or(FitMode::Cover);

  match (target_width, target_height) {
    (Some(w), Some(h)) => {
      match fit_mode {
        FitMode::Fill => Ok((w, h)),
        FitMode::Cover | FitMode::Contain => {
          let src_ratio = src_width as f64 / src_height as f64;
          let target_ratio = w as f64 / h as f64;

          let (new_w, new_h) = if matches!(fit_mode, FitMode::Cover) {
            if src_ratio > target_ratio {
              (w, (w as f64 / src_ratio).round() as u32)
            } else {
              ((h as f64 * src_ratio).round() as u32, h)
            }
          } else {
            if src_ratio > target_ratio {
              (w, (w as f64 / src_ratio).round() as u32)
            } else {
              ((h as f64 * src_ratio).round() as u32, h)
            }
          };

          Ok((new_w.max(1), new_h.max(1)))
        }
        FitMode::Inside => {
          if src_width <= w && src_height <= h {
            Ok((src_width, src_height))
          } else {
            let ratio = (w as f64 / src_width as f64).min(h as f64 / src_height as f64);
            Ok((
              (src_width as f64 * ratio).round() as u32,
              (src_height as f64 * ratio).round() as u32,
            ))
          }
        }
        FitMode::Outside => {
          if src_width >= w && src_height >= h {
            Ok((src_width, src_height))
          } else {
            let ratio = (w as f64 / src_width as f64).max(h as f64 / src_height as f64);
            Ok((
              (src_width as f64 * ratio).round() as u32,
              (src_height as f64 * ratio).round() as u32,
            ))
          }
        }
      }
    }
    (Some(w), None) => {
      let ratio = w as f64 / src_width as f64;
      Ok((w, (src_height as f64 * ratio).round().max(1.0) as u32))
    }
    (None, Some(h)) => {
      let ratio = h as f64 / src_height as f64;
      Ok(((src_width as f64 * ratio).round().max(1.0) as u32, h))
    }
    (None, None) => Err(ImageError::InvalidDimensions(
      "Either width or height must be specified".to_string(),
    )),
  }
}

/// Resize an image - optimized version (takes ownership to avoid clone)
/// Uses RGB for images without alpha (faster)
/// Uses adaptive algorithm selection based on scale factor
/// For large downscales, uses multi-step resize for better performance
pub fn resize_image(img: DynamicImage, options: &ResizeOptions) -> Result<DynamicImage, ImageError> {
  let (src_width, src_height) = img.dimensions();

  let (dst_width, dst_height) = calculate_dimensions(
    src_width,
    src_height,
    options.width,
    options.height,
    &options.fit,
  )?;

  // OPTIMIZATION: Skip resize if image already at target dimensions
  // This happens when shrink-on-load (JPEG/WebP/HEIC) already decoded to target size
  // No clone needed since we own the image!
  if src_width == dst_width && src_height == dst_height {
    return Ok(img);
  }

  // Calculate scale factor for adaptive algorithm selection
  let scale_factor = (dst_width as f64 / src_width as f64)
    .min(dst_height as f64 / src_height as f64);

  // Check if image has alpha channel
  let has_alpha = img.color().has_alpha();

  // For significant downscales (< 75%), use multi-step resize
  // This mimics libvips/sharp behavior and is much faster than single-step
  // Sharp uses shrink-on-load for JPEG, we compensate with faster multi-step
  if scale_factor < 0.75 && options.filter.is_none() {
    return resize_multi_step(img, src_width, src_height, dst_width, dst_height, has_alpha);
  }

  let algorithm = get_resize_algorithm(&options.filter, scale_factor);
  let resize_options = FrResizeOptions::new().resize_alg(algorithm);

  if has_alpha {
    resize_rgba(&img, src_width, src_height, dst_width, dst_height, &resize_options)
  } else {
    resize_rgb(&img, src_width, src_height, dst_width, dst_height, &resize_options)
  }
}

/// Multi-step resize for large scale reductions (takes ownership to avoid clone)
/// Uses Box filter for fast halving until close to target, then final Bilinear pass
/// This is much faster than single-step convolution for large reductions
/// Box filter is ideal for downscaling as it acts as a proper averaging filter
fn resize_multi_step(
  img: DynamicImage,
  src_width: u32,
  src_height: u32,
  dst_width: u32,
  dst_height: u32,
  has_alpha: bool,
) -> Result<DynamicImage, ImageError> {
  let mut current_img = img; // Take ownership directly, no clone!
  let mut current_width = src_width;
  let mut current_height = src_height;

  // Use Box filter for fast halving - it's the ideal filter for downscaling
  // Box averages all source pixels, avoiding aliasing artifacts
  let box_options = FrResizeOptions::new().resize_alg(ResizeAlg::Convolution(fr::FilterType::Box));

  // Keep halving until we're within 2x of target size
  // Box filter is very fast and produces good results for > 2x downscales
  while current_width > dst_width * 2 && current_height > dst_height * 2 {
    let new_width = current_width / 2;
    let new_height = current_height / 2;

    current_img = if has_alpha {
      resize_rgba(&current_img, current_width, current_height, new_width, new_height, &box_options)?
    } else {
      resize_rgb(&current_img, current_width, current_height, new_width, new_height, &box_options)?
    };

    current_width = new_width;
    current_height = new_height;
  }

  // Final pass with Bilinear for speed (already at small size, quality is good enough)
  // Bilinear is 2-3x faster than Lanczos3 and quality difference is minimal at this scale
  let final_options = FrResizeOptions::new().resize_alg(ResizeAlg::Convolution(fr::FilterType::Bilinear));

  if has_alpha {
    resize_rgba(&current_img, current_width, current_height, dst_width, dst_height, &final_options)
  } else {
    resize_rgb(&current_img, current_width, current_height, dst_width, dst_height, &final_options)
  }
}

/// Resize using RGB (faster, no alpha)
#[inline]
fn resize_rgb(
  img: &DynamicImage,
  src_width: u32,
  src_height: u32,
  dst_width: u32,
  dst_height: u32,
  resize_options: &FrResizeOptions,
) -> Result<DynamicImage, ImageError> {
  let rgb = img.to_rgb8();

  let src_image = fr::images::Image::from_vec_u8(
    src_width,
    src_height,
    rgb.into_raw(),
    PixelType::U8x3,
  ).map_err(|e| ImageError::ProcessingError(format!("Failed to create source image: {}", e)))?;

  let mut dst_image = fr::images::Image::new(dst_width, dst_height, PixelType::U8x3);

  let mut resizer = fr::Resizer::new();
  resizer.resize(&src_image, &mut dst_image, resize_options)
    .map_err(|e| ImageError::ProcessingError(format!("Resize failed: {}", e)))?;

  let result_rgb = RgbImage::from_raw(dst_width, dst_height, dst_image.into_vec())
    .ok_or_else(|| ImageError::ProcessingError("Failed to create output image".to_string()))?;

  Ok(DynamicImage::ImageRgb8(result_rgb))
}

/// Resize using RGBA (for images with alpha)
#[inline]
fn resize_rgba(
  img: &DynamicImage,
  src_width: u32,
  src_height: u32,
  dst_width: u32,
  dst_height: u32,
  resize_options: &FrResizeOptions,
) -> Result<DynamicImage, ImageError> {
  let rgba = img.to_rgba8();

  // For proper alpha handling, we need to premultiply alpha
  let mut src_image = fr::images::Image::from_vec_u8(
    src_width,
    src_height,
    rgba.into_raw(),
    PixelType::U8x4,
  ).map_err(|e| ImageError::ProcessingError(format!("Failed to create source image: {}", e)))?;

  // Premultiply alpha for correct blending during resize
  let alpha_mul_div = MulDiv::default();
  alpha_mul_div.multiply_alpha_inplace(&mut src_image)
    .map_err(|e| ImageError::ProcessingError(format!("Alpha multiply failed: {}", e)))?;

  let mut dst_image = fr::images::Image::new(dst_width, dst_height, PixelType::U8x4);

  let mut resizer = fr::Resizer::new();
  resizer.resize(&src_image, &mut dst_image, resize_options)
    .map_err(|e| ImageError::ProcessingError(format!("Resize failed: {}", e)))?;

  // Unpremultiply alpha
  alpha_mul_div.divide_alpha_inplace(&mut dst_image)
    .map_err(|e| ImageError::ProcessingError(format!("Alpha divide failed: {}", e)))?;

  let result_rgba = RgbaImage::from_raw(dst_width, dst_height, dst_image.into_vec())
    .ok_or_else(|| ImageError::ProcessingError("Failed to create output image".to_string()))?;

  Ok(DynamicImage::ImageRgba8(result_rgba))
}
