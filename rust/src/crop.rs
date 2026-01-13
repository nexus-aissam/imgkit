//! Image cropping functions - zero-copy optimized
//!
//! Cropping uses `crop_imm()` which creates a view without copying pixels.
//! This makes cropping essentially free (just pointer arithmetic).

use image::{DynamicImage, GenericImageView};

use crate::error::ImageError;
use crate::{CropOptions, CropGravity};

/// Calculate crop region based on gravity (anchor point)
#[inline(always)]
fn calculate_gravity_crop(
    src_width: u32,
    src_height: u32,
    crop_width: u32,
    crop_height: u32,
    gravity: &CropGravity,
) -> (u32, u32) {
    match gravity {
        CropGravity::Center => (
            (src_width.saturating_sub(crop_width)) / 2,
            (src_height.saturating_sub(crop_height)) / 2,
        ),
        CropGravity::North => (
            (src_width.saturating_sub(crop_width)) / 2,
            0,
        ),
        CropGravity::South => (
            (src_width.saturating_sub(crop_width)) / 2,
            src_height.saturating_sub(crop_height),
        ),
        CropGravity::East => (
            src_width.saturating_sub(crop_width),
            (src_height.saturating_sub(crop_height)) / 2,
        ),
        CropGravity::West => (
            0,
            (src_height.saturating_sub(crop_height)) / 2,
        ),
        CropGravity::NorthWest => (0, 0),
        CropGravity::NorthEast => (
            src_width.saturating_sub(crop_width),
            0,
        ),
        CropGravity::SouthWest => (
            0,
            src_height.saturating_sub(crop_height),
        ),
        CropGravity::SouthEast => (
            src_width.saturating_sub(crop_width),
            src_height.saturating_sub(crop_height),
        ),
    }
}

/// Parse aspect ratio string like "16:9" or "1:1"
#[inline]
fn parse_aspect_ratio(ratio: &str) -> Option<(u32, u32)> {
    let parts: Vec<&str> = ratio.split(':').collect();
    if parts.len() != 2 {
        return None;
    }
    let w = parts[0].trim().parse::<u32>().ok()?;
    let h = parts[1].trim().parse::<u32>().ok()?;
    if w == 0 || h == 0 {
        return None;
    }
    Some((w, h))
}

/// Calculate crop dimensions to achieve target aspect ratio
#[inline]
fn calculate_aspect_ratio_crop(
    src_width: u32,
    src_height: u32,
    aspect_w: u32,
    aspect_h: u32,
) -> (u32, u32) {
    let src_ratio = src_width as f64 / src_height as f64;
    let target_ratio = aspect_w as f64 / aspect_h as f64;

    if src_ratio > target_ratio {
        // Image is wider than target ratio - crop width
        let new_width = (src_height as f64 * target_ratio).round() as u32;
        (new_width.min(src_width).max(1), src_height)
    } else {
        // Image is taller than target ratio - crop height
        let new_height = (src_width as f64 / target_ratio).round() as u32;
        (src_width, new_height.min(src_height).max(1))
    }
}

/// Crop an image - zero-copy when possible
///
/// Supports three modes:
/// 1. Explicit coordinates: x, y, width, height
/// 2. Aspect ratio: aspectRatio with optional gravity
/// 3. Dimensions with gravity: width, height, gravity (no x,y)
pub fn crop_image(img: DynamicImage, options: &CropOptions) -> Result<DynamicImage, ImageError> {
    let (src_width, src_height) = img.dimensions();

    // Determine crop region
    let (x, y, crop_width, crop_height) = if let Some(ref aspect_ratio) = options.aspect_ratio {
        // Mode 2: Aspect ratio crop
        let (aspect_w, aspect_h) = parse_aspect_ratio(aspect_ratio)
            .ok_or_else(|| ImageError::InvalidDimensions(
                format!("Invalid aspect ratio format: '{}'. Use 'W:H' format like '16:9'", aspect_ratio)
            ))?;

        let (crop_w, crop_h) = calculate_aspect_ratio_crop(src_width, src_height, aspect_w, aspect_h);
        let gravity = options.gravity.clone().unwrap_or(CropGravity::Center);
        let (cx, cy) = calculate_gravity_crop(src_width, src_height, crop_w, crop_h, &gravity);

        (cx, cy, crop_w, crop_h)
    } else if options.x.is_some() || options.y.is_some() {
        // Mode 1: Explicit coordinates
        let x = options.x.unwrap_or(0);
        let y = options.y.unwrap_or(0);
        let width = options.width.ok_or_else(||
            ImageError::InvalidDimensions("Width is required for coordinate-based crop".to_string())
        )?;
        let height = options.height.ok_or_else(||
            ImageError::InvalidDimensions("Height is required for coordinate-based crop".to_string())
        )?;

        (x, y, width, height)
    } else if options.width.is_some() || options.height.is_some() {
        // Mode 3: Dimensions with gravity (centered by default)
        let crop_w = options.width.unwrap_or(src_width);
        let crop_h = options.height.unwrap_or(src_height);
        let gravity = options.gravity.clone().unwrap_or(CropGravity::Center);
        let (cx, cy) = calculate_gravity_crop(src_width, src_height, crop_w, crop_h, &gravity);

        (cx, cy, crop_w, crop_h)
    } else {
        return Err(ImageError::InvalidDimensions(
            "Crop requires either: (x,y,width,height), (aspectRatio), or (width,height,gravity)".to_string()
        ));
    };

    // Validate bounds
    if x >= src_width || y >= src_height {
        return Err(ImageError::InvalidDimensions(format!(
            "Crop origin ({}, {}) is outside image bounds ({}x{})",
            x, y, src_width, src_height
        )));
    }

    // Clamp dimensions to image bounds
    let actual_width = crop_width.min(src_width - x);
    let actual_height = crop_height.min(src_height - y);

    if actual_width == 0 || actual_height == 0 {
        return Err(ImageError::InvalidDimensions(
            "Crop region has zero width or height".to_string()
        ));
    }

    // Zero-copy crop - just creates a view!
    // This is essentially free (pointer arithmetic only)
    Ok(img.crop_imm(x, y, actual_width, actual_height))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_aspect_ratio() {
        assert_eq!(parse_aspect_ratio("16:9"), Some((16, 9)));
        assert_eq!(parse_aspect_ratio("1:1"), Some((1, 1)));
        assert_eq!(parse_aspect_ratio("4:3"), Some((4, 3)));
        assert_eq!(parse_aspect_ratio("invalid"), None);
        assert_eq!(parse_aspect_ratio("0:9"), None);
    }

    #[test]
    fn test_calculate_aspect_ratio_crop() {
        // 1920x1080 (16:9) -> 1:1 should crop to 1080x1080
        let (w, h) = calculate_aspect_ratio_crop(1920, 1080, 1, 1);
        assert_eq!((w, h), (1080, 1080));

        // 1080x1920 (9:16) -> 1:1 should crop to 1080x1080
        let (w, h) = calculate_aspect_ratio_crop(1080, 1920, 1, 1);
        assert_eq!((w, h), (1080, 1080));
    }

    #[test]
    fn test_calculate_gravity_crop() {
        // 1000x1000 image, 500x500 crop
        assert_eq!(calculate_gravity_crop(1000, 1000, 500, 500, &CropGravity::Center), (250, 250));
        assert_eq!(calculate_gravity_crop(1000, 1000, 500, 500, &CropGravity::NorthWest), (0, 0));
        assert_eq!(calculate_gravity_crop(1000, 1000, 500, 500, &CropGravity::SouthEast), (500, 500));
    }
}
