import { toTensor, toTensorSync } from "../src/index";

async function benchmark() {
  // Download test image
  console.log("Downloading test image...");
  const response = await fetch("https://picsum.photos/1920/1080.jpg");
  const largeImage = Buffer.from(await response.arrayBuffer());

  const response2 = await fetch("https://picsum.photos/800/600.jpg");
  const mediumImage = Buffer.from(await response2.arrayBuffer());

  console.log("\n=== toTensor Benchmark Results ===\n");

  // Test 1: 224x224 with ImageNet normalization (most common ML use case)
  console.log("1. 224x224 ImageNet normalization (PyTorch/ONNX):");
  let start = performance.now();
  for (let i = 0; i < 100; i++) {
    await toTensor(mediumImage, {
      width: 224,
      height: 224,
      normalization: "Imagenet",
      layout: "Chw",
    });
  }
  let elapsed = performance.now() - start;
  console.log(
    "   Async: " + (elapsed / 100).toFixed(2) + "ms avg (100 iterations)"
  );

  start = performance.now();
  for (let i = 0; i < 100; i++) {
    toTensorSync(mediumImage, {
      width: 224,
      height: 224,
      normalization: "Imagenet",
      layout: "Chw",
    });
  }
  elapsed = performance.now() - start;
  console.log(
    "   Sync:  " + (elapsed / 100).toFixed(2) + "ms avg (100 iterations)"
  );

  // Test 2: Large image downscale
  console.log("\n2. 1920x1080 -> 224x224 (large downscale):");
  start = performance.now();
  for (let i = 0; i < 50; i++) {
    await toTensor(largeImage, {
      width: 224,
      height: 224,
      normalization: "Imagenet",
      layout: "Chw",
    });
  }
  elapsed = performance.now() - start;
  console.log(
    "   Async: " + (elapsed / 50).toFixed(2) + "ms avg (50 iterations)"
  );

  // Test 3: Different normalizations
  console.log("\n3. Normalization comparison (224x224):");
  const normalizations = ["Imagenet", "Clip", "ZeroOne", "None"];
  for (const norm of normalizations) {
    start = performance.now();
    for (let i = 0; i < 50; i++) {
      toTensorSync(mediumImage, {
        width: 224,
        height: 224,
        normalization: norm as any,
        layout: "Chw",
      });
    }
    elapsed = performance.now() - start;
    console.log(
      "   " + norm.padEnd(10) + ": " + (elapsed / 50).toFixed(2) + "ms avg"
    );
  }

  // Test 4: Uint8 vs Float32
  console.log("\n4. Dtype comparison (224x224):");
  start = performance.now();
  for (let i = 0; i < 100; i++) {
    toTensorSync(mediumImage, {
      width: 224,
      height: 224,
      dtype: "Float32",
      layout: "Chw",
    });
  }
  elapsed = performance.now() - start;
  console.log("   Float32: " + (elapsed / 100).toFixed(2) + "ms avg");

  start = performance.now();
  for (let i = 0; i < 100; i++) {
    toTensorSync(mediumImage, {
      width: 224,
      height: 224,
      dtype: "Uint8",
      layout: "Chw",
    });
  }
  elapsed = performance.now() - start;
  console.log("   Uint8:   " + (elapsed / 100).toFixed(2) + "ms avg");

  // Test 5: Different sizes
  console.log("\n5. Output size comparison:");
  const sizes = [
    [224, 224],
    [384, 384],
    [512, 512],
    [640, 640],
  ];
  for (const [w, h] of sizes) {
    start = performance.now();
    for (let i = 0; i < 50; i++) {
      toTensorSync(mediumImage, {
        width: w,
        height: h,
        normalization: "Imagenet",
        layout: "Chw",
      });
    }
    elapsed = performance.now() - start;
    console.log(
      "   " + w + "x" + h + ": " + (elapsed / 50).toFixed(2) + "ms avg"
    );
  }

  console.log("\n=== Benchmark Complete ===");
}

benchmark().catch(console.error);
