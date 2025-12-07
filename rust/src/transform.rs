//! Image transformation functions (all-in-one processing)

use image::{DynamicImage, ImageBuffer, Rgba, RgbaImage};
use napi::bindgen_prelude::Buffer;

use crate::decode;
use crate::encode;
use crate::resize;
use crate::error::ImageError;
use crate::TransformOptions;

/// Apply all transformations to an image
pub fn transform_image(input: &[u8], options: &TransformOptions) -> Result<Buffer, ImageError> {
  // Use scale-on-decode for JPEG images when resize is specified - massive speedup
  let target_width = options.resize.as_ref().and_then(|r| r.width);
  let target_height = options.resize.as_ref().and_then(|r| r.height);
  let mut img = decode::decode_image_with_target(input, target_width, target_height)?;

  // Apply transformations in order

  // 1. Resize (if specified)
  if let Some(ref resize_opts) = options.resize {
    img = resize::resize_image(&img, resize_opts)?;
  }

  // 2. Rotate (if specified)
  if let Some(degrees) = options.rotate {
    img = match degrees {
      90 | -270 => img.rotate90(),
      180 | -180 => img.rotate180(),
      270 | -90 => img.rotate270(),
      _ => img, // Ignore invalid rotations
    };
  }

  // 3. Flip horizontally
  if options.flip_h.unwrap_or(false) {
    img = img.fliph();
  }

  // 4. Flip vertically
  if options.flip_v.unwrap_or(false) {
    img = img.flipv();
  }

  // 5. Grayscale
  if options.grayscale.unwrap_or(false) {
    img = DynamicImage::ImageLuma8(img.to_luma8());
  }

  // 6. Blur (convert u32 to f32)
  if let Some(blur_amount) = options.blur {
    if blur_amount > 0 {
      let sigma = blur_amount as f32;
      img = img.blur(sigma);
    }
  }

  // 7. Sharpen (using unsharp mask, convert u32 to f32)
  if let Some(sharpen_amount) = options.sharpen {
    if sharpen_amount > 0 {
      let amount = sharpen_amount as f32;
      img = img.unsharpen(amount, 1);
    }
  }

  // 8. Brightness adjustment
  if let Some(brightness) = options.brightness {
    if brightness != 0 {
      img = adjust_brightness(&img, brightness);
    }
  }

  // 9. Contrast adjustment
  if let Some(contrast) = options.contrast {
    if contrast != 0 {
      img = img.adjust_contrast(contrast as f32);
    }
  }

  // Encode output
  let output = if let Some(ref output_opts) = options.output {
    encode::encode_to_format(
      &img,
      &output_opts.format,
      output_opts.jpeg.as_ref(),
      output_opts.png.as_ref(),
      output_opts.webp.as_ref(),
    )?
  } else {
    // Default to PNG
    encode::encode_png(&img, None)?
  };

  Ok(Buffer::from(output))
}

/// Adjust brightness of an image
fn adjust_brightness(img: &DynamicImage, value: i32) -> DynamicImage {
  let rgba = img.to_rgba8();
  let (width, height) = rgba.dimensions();

  let adjusted: RgbaImage = ImageBuffer::from_fn(width, height, |x, y| {
    let pixel = rgba.get_pixel(x, y);
    let adjust = |c: u8| -> u8 {
      let new_val = c as i32 + value;
      new_val.clamp(0, 255) as u8
    };

    Rgba([
      adjust(pixel[0]),
      adjust(pixel[1]),
      adjust(pixel[2]),
      pixel[3], // Keep alpha unchanged
    ])
  });

  DynamicImage::ImageRgba8(adjusted)
}
