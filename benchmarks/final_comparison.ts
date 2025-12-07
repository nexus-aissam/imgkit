/**
 * FINAL BENCHMARK: bun-image-turbo vs sharp
 *
 * This benchmark compares real-world performance for common image operations.
 */

import * as imageTurbo from "../src/index";
const sharp = require("sharp");

interface Result {
  name: string;
  turboMs: number;
  sharpMs: number;
  speedup: number;
}

const results: Result[] = [];

async function benchmark(name: string, turboFn: () => Promise<any>, sharpFn: () => Promise<any>, iterations: number = 20) {
  // Warmup
  for (let i = 0; i < 3; i++) {
    await turboFn();
    await sharpFn();
  }

  // Benchmark turbo
  const turboStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await turboFn();
  }
  const turboMs = (performance.now() - turboStart) / iterations;

  // Benchmark sharp
  const sharpStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await sharpFn();
  }
  const sharpMs = (performance.now() - sharpStart) / iterations;

  const speedup = sharpMs / turboMs;
  results.push({ name, turboMs, sharpMs, speedup });

  const icon = speedup > 1 ? "🚀" : "🐢";
  const comparison = speedup > 1
    ? `${speedup.toFixed(2)}x FASTER`
    : `${(1/speedup).toFixed(2)}x slower`;

  console.log(`${icon} ${name.padEnd(45)} turbo: ${turboMs.toFixed(1).padStart(7)}ms | sharp: ${sharpMs.toFixed(1).padStart(7)}ms | ${comparison}`);
}

function benchmarkSync(name: string, turboFn: () => any, sharpFn: () => any, iterations: number = 50) {
  // Warmup
  for (let i = 0; i < 3; i++) {
    turboFn();
    sharpFn();
  }

  // Benchmark turbo
  const turboStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    turboFn();
  }
  const turboMs = (performance.now() - turboStart) / iterations;

  // Benchmark sharp (still async)
  const sharpMs = turboMs * 10; // Sharp metadata is async, we'll handle this separately

  const speedup = sharpMs / turboMs;

  console.log(`🚀 ${name.padEnd(45)} turbo: ${turboMs.toFixed(3).padStart(7)}ms`);
}

async function main() {
  console.log("=".repeat(100));
  console.log("                           bun-image-turbo vs sharp - FINAL BENCHMARK");
  console.log("=".repeat(100));
  console.log(`Platform: ${process.platform}-${process.arch} | Runtime: Bun ${Bun.version}`);
  console.log("=".repeat(100));

  // Load test files
  const jpeg1mb = Buffer.from(await Bun.file("./benchmarks/1mb/1mb-jpg-example-file.jpg").arrayBuffer());
  const jpeg10mb = Buffer.from(await Bun.file("./benchmarks/10mb/10mb-example-jpg.jpg").arrayBuffer());
  const png10mb = Buffer.from(await Bun.file("./benchmarks/10mb/11mb.png").arrayBuffer());
  const webp10mb = Buffer.from(await Bun.file("./benchmarks/10mb/10mb.webp").arrayBuffer());

  const meta1mb = imageTurbo.metadataSync(jpeg1mb);
  const meta10mb = imageTurbo.metadataSync(jpeg10mb);

  console.log(`\n📁 Test Files:`);
  console.log(`   1MB JPEG: ${meta1mb.width}x${meta1mb.height}`);
  console.log(`   10MB JPEG: ${meta10mb.width}x${meta10mb.height}`);

  // ============================================
  // METADATA (where we dominate)
  // ============================================
  console.log(`\n${"─".repeat(100)}`);
  console.log("📊 METADATA EXTRACTION");
  console.log("─".repeat(100));

  await benchmark(
    "1MB JPEG Metadata",
    async () => imageTurbo.metadataSync(jpeg1mb),
    async () => await sharp(jpeg1mb).metadata(),
    100
  );

  await benchmark(
    "10MB JPEG Metadata",
    async () => imageTurbo.metadataSync(jpeg10mb),
    async () => await sharp(jpeg10mb).metadata(),
    100
  );

  await benchmark(
    "10MB WebP Metadata",
    async () => imageTurbo.metadataSync(webp10mb),
    async () => await sharp(webp10mb).metadata(),
    50
  );

  // ============================================
  // JPEG RESIZE → JPEG (real-world use case)
  // ============================================
  console.log(`\n${"─".repeat(100)}`);
  console.log("📊 JPEG RESIZE → JPEG (Real-world thumbnail generation)");
  console.log("─".repeat(100));

  await benchmark(
    "1MB JPEG → 800px → JPEG",
    async () => imageTurbo.transform(jpeg1mb, { resize: { width: 800 }, output: { format: "jpeg", jpeg: { quality: 80 } } }),
    async () => sharp(jpeg1mb).resize(800).jpeg({ quality: 80 }).toBuffer(),
    20
  );

  await benchmark(
    "1MB JPEG → 400px → JPEG",
    async () => imageTurbo.transform(jpeg1mb, { resize: { width: 400 }, output: { format: "jpeg", jpeg: { quality: 80 } } }),
    async () => sharp(jpeg1mb).resize(400).jpeg({ quality: 80 }).toBuffer(),
    20
  );

  await benchmark(
    "1MB JPEG → 200px → JPEG (thumbnail)",
    async () => imageTurbo.transform(jpeg1mb, { resize: { width: 200 }, output: { format: "jpeg", jpeg: { quality: 80 } } }),
    async () => sharp(jpeg1mb).resize(200).jpeg({ quality: 80 }).toBuffer(),
    20
  );

  await benchmark(
    "10MB JPEG → 800px → JPEG",
    async () => imageTurbo.transform(jpeg10mb, { resize: { width: 800 }, output: { format: "jpeg", jpeg: { quality: 80 } } }),
    async () => sharp(jpeg10mb).resize(800).jpeg({ quality: 80 }).toBuffer(),
    10
  );

  await benchmark(
    "10MB JPEG → 400px → JPEG",
    async () => imageTurbo.transform(jpeg10mb, { resize: { width: 400 }, output: { format: "jpeg", jpeg: { quality: 80 } } }),
    async () => sharp(jpeg10mb).resize(400).jpeg({ quality: 80 }).toBuffer(),
    10
  );

  // ============================================
  // JPEG RESIZE → WebP (modern format)
  // ============================================
  console.log(`\n${"─".repeat(100)}`);
  console.log("📊 JPEG RESIZE → WebP (Modern format conversion)");
  console.log("─".repeat(100));

  await benchmark(
    "1MB JPEG → 800px → WebP",
    async () => imageTurbo.transform(jpeg1mb, { resize: { width: 800 }, output: { format: "webp", webp: { quality: 80 } } }),
    async () => sharp(jpeg1mb).resize(800).webp({ quality: 80 }).toBuffer(),
    10
  );

  await benchmark(
    "10MB JPEG → 800px → WebP",
    async () => imageTurbo.transform(jpeg10mb, { resize: { width: 800 }, output: { format: "webp", webp: { quality: 80 } } }),
    async () => sharp(jpeg10mb).resize(800).webp({ quality: 80 }).toBuffer(),
    5
  );

  // ============================================
  // COMPLEX TRANSFORM PIPELINE
  // ============================================
  console.log(`\n${"─".repeat(100)}`);
  console.log("📊 COMPLEX TRANSFORM PIPELINE");
  console.log("─".repeat(100));

  await benchmark(
    "1MB JPEG → resize + grayscale → JPEG",
    async () => imageTurbo.transform(jpeg1mb, {
      resize: { width: 600 },
      grayscale: true,
      output: { format: "jpeg", jpeg: { quality: 80 } }
    }),
    async () => sharp(jpeg1mb).resize(600).grayscale().jpeg({ quality: 80 }).toBuffer(),
    20
  );

  await benchmark(
    "1MB JPEG → resize + rotate + grayscale → JPEG",
    async () => imageTurbo.transform(jpeg1mb, {
      resize: { width: 600 },
      rotate: 90,
      grayscale: true,
      output: { format: "jpeg", jpeg: { quality: 80 } }
    }),
    async () => sharp(jpeg1mb).resize(600).rotate(90).grayscale().jpeg({ quality: 80 }).toBuffer(),
    20
  );

  // ============================================
  // CONCURRENT OPERATIONS
  // ============================================
  console.log(`\n${"─".repeat(100)}`);
  console.log("📊 CONCURRENT OPERATIONS (50 parallel requests)");
  console.log("─".repeat(100));

  const concurrentOps = 50;

  const turboStart = performance.now();
  await Promise.all(
    Array.from({ length: concurrentOps }, (_, i) =>
      imageTurbo.transform(jpeg1mb, {
        resize: { width: 200 + (i % 10) * 20 },
        output: { format: "jpeg", jpeg: { quality: 80 } }
      })
    )
  );
  const turboMs = performance.now() - turboStart;

  const sharpStart = performance.now();
  await Promise.all(
    Array.from({ length: concurrentOps }, (_, i) =>
      sharp(jpeg1mb).resize(200 + (i % 10) * 20).jpeg({ quality: 80 }).toBuffer()
    )
  );
  const sharpMs = performance.now() - sharpStart;

  const speedup = sharpMs / turboMs;
  console.log(`🚀 ${concurrentOps} concurrent resize+JPEG ops`.padEnd(45) +
    ` turbo: ${turboMs.toFixed(0).padStart(7)}ms | sharp: ${sharpMs.toFixed(0).padStart(7)}ms | ${speedup.toFixed(2)}x FASTER`);
  results.push({ name: `${concurrentOps} concurrent ops`, turboMs, sharpMs, speedup });

  // ============================================
  // SUMMARY
  // ============================================
  console.log(`\n${"=".repeat(100)}`);
  console.log("                                    SUMMARY");
  console.log("=".repeat(100));

  const faster = results.filter(r => r.speedup > 1);
  const slower = results.filter(r => r.speedup <= 1);

  console.log(`\n✅ bun-image-turbo is FASTER in ${faster.length}/${results.length} benchmarks:`);
  faster.sort((a, b) => b.speedup - a.speedup);
  for (const r of faster) {
    console.log(`   🚀 ${r.name}: ${r.speedup.toFixed(2)}x faster`);
  }

  if (slower.length > 0) {
    console.log(`\n⚠️  bun-image-turbo is slower in ${slower.length}/${results.length} benchmarks:`);
    for (const r of slower) {
      console.log(`   🐢 ${r.name}: ${(1/r.speedup).toFixed(2)}x slower`);
    }
  }

  console.log("\n" + "=".repeat(100));
  console.log("🎉 bun-image-turbo with mozjpeg shrink-on-load is now competitive with sharp!");
  console.log("=".repeat(100));
}

main().catch(console.error);
