import * as imageTurbo from "../src/index";
const sharp = require("sharp");

const jpeg1mb = Buffer.from(await Bun.file("./benchmarks/1mb/1mb-jpg-example-file.jpg").arrayBuffer());

console.log("=== CONCURRENT PERFORMANCE TEST ===\n");

for (const concurrency of [10, 25, 50, 100]) {
  // Warmup
  await Promise.all(Array.from({ length: 3 }, () =>
    imageTurbo.transform(jpeg1mb, { resize: { width: 400 }, output: { format: "jpeg", jpeg: { quality: 80 } } })
  ));
  await Promise.all(Array.from({ length: 3 }, () =>
    sharp(jpeg1mb).resize(400).jpeg({ quality: 80 }).toBuffer()
  ));

  // Turbo
  let start = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () =>
    imageTurbo.transform(jpeg1mb, { resize: { width: 400 }, output: { format: "jpeg", jpeg: { quality: 80 } } })
  ));
  const turboMs = performance.now() - start;

  // Sharp
  start = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () =>
    sharp(jpeg1mb).resize(400).jpeg({ quality: 80 }).toBuffer()
  ));
  const sharpMs = performance.now() - start;

  const speedup = sharpMs / turboMs;
  console.log(`${concurrency} concurrent ops: turbo=${turboMs.toFixed(0)}ms, sharp=${sharpMs.toFixed(0)}ms, speedup=${speedup.toFixed(2)}x`);
}
