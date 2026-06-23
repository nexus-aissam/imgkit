//! Image compositing / overlay / watermark functions
//!
//! Paints one or more layers onto a base image using alpha compositing and
//! the W3C separable blend modes (multiply, screen, overlay, …). Supports
//! gravity- or coordinate-based placement, per-layer opacity, optional resize,
//! and tiled watermark patterns.

use image::{DynamicImage, Rgba, RgbaImage};

use crate::decode;
use crate::encode;
use crate::error::ImageError;
use crate::resize;
use crate::{BlendMode, CompositeOptions, CropGravity};

/// Apply a separable blend function to a single non-premultiplied channel.
/// `cb` = backdrop channel, `cs` = source channel, both in 0.0..=1.0.
#[inline(always)]
fn blend_channel(mode: &BlendMode, cb: f32, cs: f32) -> f32 {
  match mode {
    BlendMode::Over => cs,
    BlendMode::Multiply => cb * cs,
    BlendMode::Screen => cb + cs - cb * cs,
    BlendMode::Darken => cb.min(cs),
    BlendMode::Lighten => cb.max(cs),
    BlendMode::Overlay => {
      // overlay(cb, cs) == hard-light(cs, cb)
      if cb <= 0.5 {
        2.0 * cb * cs
      } else {
        1.0 - 2.0 * (1.0 - cb) * (1.0 - cs)
      }
    }
    BlendMode::Add => (cb + cs).min(1.0),
  }
}

/// Composite a single source pixel onto a destination pixel in place.
/// Implements W3C Compositing Level 1 (blend, then source-over).
#[inline(always)]
fn composite_pixel(dst: &mut Rgba<u8>, src: &Rgba<u8>, mode: &BlendMode, opacity: f32) {
  // Effective source alpha after per-layer opacity.
  let a_s = (src[3] as f32 / 255.0) * opacity;
  if a_s <= 0.0 {
    return; // fully transparent source contributes nothing
  }

  // Fast path: fully opaque normal paint just replaces the destination.
  if a_s >= 1.0 && matches!(mode, BlendMode::Over) {
    *dst = Rgba([src[0], src[1], src[2], 255]);
    return;
  }

  let a_b = dst[3] as f32 / 255.0;
  let a_o = a_s + a_b * (1.0 - a_s);
  if a_o <= 0.0 {
    *dst = Rgba([0, 0, 0, 0]);
    return;
  }

  let mut out = [0u8; 4];
  for i in 0..3 {
    let cs = src[i] as f32 / 255.0;
    let cb = dst[i] as f32 / 255.0;
    // Blend the source against the backdrop, weighted by backdrop alpha.
    let blended = (1.0 - a_b) * cs + a_b * blend_channel(mode, cb, cs);
    // Source-over with the (possibly blended) source color.
    let co = (a_s * blended + a_b * (1.0 - a_s) * cb) / a_o;
    out[i] = (co * 255.0).round().clamp(0.0, 255.0) as u8;
  }
  out[3] = (a_o * 255.0).round().clamp(0.0, 255.0) as u8;
  *dst = Rgba(out);
}

/// Compute the top-left placement of a layer for a given gravity.
/// Returns signed coordinates so layers larger than the canvas (or negative
/// offsets) are handled and clipped naturally during blitting.
#[inline]
fn gravity_position(
  canvas_w: u32,
  canvas_h: u32,
  layer_w: u32,
  layer_h: u32,
  gravity: &CropGravity,
) -> (i64, i64) {
  let cw = canvas_w as i64;
  let ch = canvas_h as i64;
  let lw = layer_w as i64;
  let lh = layer_h as i64;
  let cx = (cw - lw) / 2;
  let cy = (ch - lh) / 2;
  let right = cw - lw;
  let bottom = ch - lh;

  match gravity {
    CropGravity::Center => (cx, cy),
    CropGravity::North => (cx, 0),
    CropGravity::South => (cx, bottom),
    CropGravity::East => (right, cy),
    CropGravity::West => (0, cy),
    CropGravity::NorthWest => (0, 0),
    CropGravity::NorthEast => (right, 0),
    CropGravity::SouthWest => (0, bottom),
    CropGravity::SouthEast => (right, bottom),
  }
}

/// Blit an overlay onto the canvas at signed top-left (bx, by), clipping to bounds.
#[inline]
fn blit(
  canvas: &mut RgbaImage,
  overlay: &RgbaImage,
  bx: i64,
  by: i64,
  mode: &BlendMode,
  opacity: f32,
) {
  let cw = canvas.width() as i64;
  let ch = canvas.height() as i64;
  let lw = overlay.width() as i64;
  let lh = overlay.height() as i64;

  for sy in 0..lh {
    let dy = by + sy;
    if dy < 0 || dy >= ch {
      continue;
    }
    for sx in 0..lw {
      let dx = bx + sx;
      if dx < 0 || dx >= cw {
        continue;
      }
      let src = *overlay.get_pixel(sx as u32, sy as u32);
      let dst = canvas.get_pixel_mut(dx as u32, dy as u32);
      composite_pixel(dst, &src, mode, opacity);
    }
  }
}

/// Composite all layers onto the base image and return encoded bytes.
pub fn composite_image(base: &[u8], options: &CompositeOptions) -> Result<Vec<u8>, ImageError> {
  // Decode the base as RGBA so we always have an alpha channel to blend into.
  let base_img = decode::decode_image(base)?;
  let mut canvas = base_img.to_rgba8();
  let (cw, ch) = (canvas.width(), canvas.height());

  for layer in &options.layers {
    // Decode + optional resize of the layer.
    let mut layer_img = decode::decode_image(&layer.input)?;
    if let Some(ref resize_opts) = layer.resize {
      layer_img = resize::resize_image(layer_img, resize_opts)?;
    }
    let overlay = layer_img.to_rgba8();
    let (lw, lh) = (overlay.width(), overlay.height());
    if lw == 0 || lh == 0 {
      continue; // nothing to paint
    }

    let opacity = layer.opacity.unwrap_or(1.0).clamp(0.0, 1.0) as f32;
    let mode = layer.blend.clone().unwrap_or(BlendMode::Over);
    let off_x = layer.offset_x.unwrap_or(0) as i64;
    let off_y = layer.offset_y.unwrap_or(0) as i64;

    if layer.tile.unwrap_or(false) {
      // Repeat the layer across the entire canvas (watermark pattern).
      let lw_i = lw as i64;
      let lh_i = lh as i64;

      // Normalize the phase so the first tile starts at or before the origin.
      let mut start_x = off_x % lw_i;
      if start_x > 0 {
        start_x -= lw_i;
      }
      let mut start_y = off_y % lh_i;
      if start_y > 0 {
        start_y -= lh_i;
      }

      let mut by = start_y;
      while by < ch as i64 {
        let mut bx = start_x;
        while bx < cw as i64 {
          blit(&mut canvas, &overlay, bx, by, &mode, opacity);
          bx += lw_i;
        }
        by += lh_i;
      }
    } else {
      // Single placement: explicit coordinates take priority over gravity.
      let (bx, by) = if layer.left.is_some() || layer.top.is_some() {
        (
          layer.left.unwrap_or(0) as i64,
          layer.top.unwrap_or(0) as i64,
        )
      } else {
        let gravity = layer.gravity.clone().unwrap_or(CropGravity::Center);
        let (gx, gy) = gravity_position(cw, ch, lw, lh, &gravity);
        (gx + off_x, gy + off_y)
      };
      blit(&mut canvas, &overlay, bx, by, &mode, opacity);
    }
  }

  // Encode the composited canvas.
  let dyn_img = DynamicImage::ImageRgba8(canvas);
  let output = if let Some(ref output_opts) = options.output {
    encode::encode_to_format(
      &dyn_img,
      &output_opts.format,
      output_opts.jpeg.as_ref(),
      output_opts.png.as_ref(),
      output_opts.webp.as_ref(),
    )?
  } else {
    // Default to PNG to preserve any transparency.
    encode::encode_png(&dyn_img, None)?
  };

  Ok(output)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_gravity_position() {
    // 1000x1000 canvas, 200x200 layer
    assert_eq!(gravity_position(1000, 1000, 200, 200, &CropGravity::NorthWest), (0, 0));
    assert_eq!(gravity_position(1000, 1000, 200, 200, &CropGravity::SouthEast), (800, 800));
    assert_eq!(gravity_position(1000, 1000, 200, 200, &CropGravity::Center), (400, 400));
    assert_eq!(gravity_position(1000, 1000, 200, 200, &CropGravity::North), (400, 0));
    assert_eq!(gravity_position(1000, 1000, 200, 200, &CropGravity::East), (800, 400));
  }

  #[test]
  fn test_layer_larger_than_canvas() {
    // Layer bigger than canvas → centered with negative origin
    assert_eq!(gravity_position(100, 100, 200, 200, &CropGravity::Center), (-50, -50));
  }

  #[test]
  fn test_composite_pixel_opaque_over_replaces() {
    let mut dst = Rgba([0u8, 0, 0, 255]);
    let src = Rgba([255u8, 128, 64, 255]);
    composite_pixel(&mut dst, &src, &BlendMode::Over, 1.0);
    assert_eq!(dst, Rgba([255, 128, 64, 255]));
  }

  #[test]
  fn test_composite_pixel_transparent_source_noop() {
    let mut dst = Rgba([10u8, 20, 30, 255]);
    let src = Rgba([255u8, 255, 255, 0]);
    composite_pixel(&mut dst, &src, &BlendMode::Over, 1.0);
    assert_eq!(dst, Rgba([10, 20, 30, 255]));
  }

  #[test]
  fn test_composite_pixel_half_opacity() {
    // White at 50% opacity over black → mid grey, fully opaque result
    let mut dst = Rgba([0u8, 0, 0, 255]);
    let src = Rgba([255u8, 255, 255, 255]);
    composite_pixel(&mut dst, &src, &BlendMode::Over, 0.5);
    assert_eq!(dst[3], 255);
    assert!((dst[0] as i32 - 128).abs() <= 1);
  }

  #[test]
  fn test_blend_channel_modes() {
    // Multiply of full white keeps backdrop
    assert!((blend_channel(&BlendMode::Multiply, 0.5, 1.0) - 0.5).abs() < 1e-6);
    // Screen of black keeps backdrop
    assert!((blend_channel(&BlendMode::Screen, 0.5, 0.0) - 0.5).abs() < 1e-6);
    // Darken/Lighten
    assert!((blend_channel(&BlendMode::Darken, 0.3, 0.7) - 0.3).abs() < 1e-6);
    assert!((blend_channel(&BlendMode::Lighten, 0.3, 0.7) - 0.7).abs() < 1e-6);
  }
}
