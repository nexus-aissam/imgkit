/**
 * Composite / Overlay / Watermark Examples for imgkit
 *
 * Run with:  bun run examples/composite.ts
 * Outputs land in examples/output/
 */

import { composite, resize, metadata, version } from 'imgkit';

async function main() {
  console.log(`imgkit v${version()}\n`);

  // Base photo
  console.log('Downloading base photo + logo...');
  const baseRes = await fetch('https://picsum.photos/seed/composite-demo/1280/720.jpg');
  const base = Buffer.from(await baseRes.arrayBuffer());

  // A second image used as the "logo" / overlay
  const logoRes = await fetch('https://picsum.photos/seed/composite-logo/300/300.jpg');
  const logoRaw = Buffer.from(await logoRes.arrayBuffer());

  // Pre-scale the logo to a tidy 180px badge
  const logo = await resize(logoRaw, { width: 180 });
  console.log('Ready.\n');

  // 1. Bottom-right watermark at 70% opacity
  console.log('=== Watermark (southEast, 70%) ===');
  const watermarked = await composite(base, {
    layers: [{ input: logo, gravity: 'southEast', opacity: 0.7, offsetX: -32, offsetY: -32 }],
    output: { format: 'jpeg', jpeg: { quality: 90 } },
  });
  await Bun.write('./output/composite-watermark.jpg', watermarked);
  console.log(`Saved output/composite-watermark.jpg (${(watermarked.length / 1024).toFixed(1)} KB)\n`);

  // 2. Tiled repeating watermark
  console.log('=== Tiled watermark ===');
  const tiled = await composite(base, {
    layers: [{ input: await resize(logoRaw, { width: 90 }), tile: true, opacity: 0.15 }],
    output: { format: 'jpeg', jpeg: { quality: 85 } },
  });
  await Bun.write('./output/composite-tiled.jpg', tiled);
  console.log(`Saved output/composite-tiled.jpg (${(tiled.length / 1024).toFixed(1)} KB)\n`);

  // 3. Blend mode (multiply)
  console.log('=== Blend mode: multiply (center, 60%) ===');
  const blended = await composite(base, {
    layers: [{ input: logo, gravity: 'center', blend: 'multiply', opacity: 0.6 }],
    output: { format: 'jpeg', jpeg: { quality: 90 } },
  });
  await Bun.write('./output/composite-multiply.jpg', blended);
  console.log(`Saved output/composite-multiply.jpg (${(blended.length / 1024).toFixed(1)} KB)\n`);

  // 4. Multiple stacked layers
  console.log('=== Multiple layers ===');
  const stacked = await composite(base, {
    layers: [
      { input: await resize(logoRaw, { width: 120 }), gravity: 'northWest', offsetX: 24, offsetY: 24 },
      { input: logo, gravity: 'southEast', opacity: 0.8, offsetX: -24, offsetY: -24 },
    ],
    output: { format: 'png' },
  });
  await Bun.write('./output/composite-stacked.png', stacked);
  const meta = await metadata(stacked);
  console.log(`Saved output/composite-stacked.png (${meta.width}x${meta.height})\n`);

  console.log('All composite examples completed! Check ./output folder');
}

// Create output directory
await Bun.write('./output/.gitkeep', '');

main().catch(console.error);
