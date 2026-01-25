#!/usr/bin/env bun
/**
 * imgkit-build - Build Bun executables with native module support
 *
 * This wrapper automatically handles copying the native module to the output directory.
 *
 * Usage:
 *   bunx imgkit-build --compile --outfile dist/app src/index.ts
 *
 * This is equivalent to running:
 *   bun build --compile --outfile dist/app src/index.ts
 *   cp node_modules/imgkit-<platform>/image-turbo.<platform>.node dist/
 */

import { existsSync, copyFileSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import { spawnSync } from "child_process";

// Get platform info
const platform = process.platform;
const arch = process.arch;

function getTargetInfo() {
  let targetName: string;
  let packageSuffix: string;

  switch (platform) {
    case "darwin":
      targetName = arch === "arm64" ? "darwin-arm64" : "darwin-x64";
      packageSuffix = targetName;
      break;
    case "linux":
      const isMusl = existsSync("/etc/alpine-release");
      if (arch === "arm64") {
        targetName = isMusl ? "linux-arm64-musl" : "linux-arm64-gnu";
      } else {
        targetName = isMusl ? "linux-x64-musl" : "linux-x64-gnu";
      }
      packageSuffix = targetName;
      break;
    case "win32":
      targetName = arch === "arm64" ? "win32-arm64-msvc" : "win32-x64-msvc";
      packageSuffix = arch === "arm64" ? "windows-arm64" : "windows-x64";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  return {
    binaryName: `image-turbo.${targetName}.node`,
    packageName: `imgkit-${packageSuffix}`,
  };
}

function findNativeBinary(packageName: string, binaryName: string): string | null {
  const paths = [
    join(process.cwd(), "node_modules", packageName, binaryName),
    join(process.cwd(), "node_modules", "imgkit", binaryName),
  ];

  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function parseOutfile(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--outfile" && args[i + 1]) {
      return args[i + 1];
    }
    if (args[i].startsWith("--outfile=")) {
      return args[i].substring("--outfile=".length);
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(`
imgkit-build - Build Bun executables with native module support

Usage:
  bunx imgkit-build [bun build options]

Examples:
  bunx imgkit-build --compile --outfile dist/app src/index.ts
  bunx imgkit-build --compile --minify --outfile dist/app src/index.ts

This command:
  1. Runs 'bun build' with your options
  2. Automatically copies the imgkit native module to the output directory

Your app will work without any code changes or environment variables!
`);
    process.exit(0);
  }

  console.log("\n🖼️  imgkit-build\n");

  // Get native module info
  const { binaryName, packageName } = getTargetInfo();
  console.log(`Platform: ${platform}-${arch}`);
  console.log(`Native module: ${binaryName}\n`);

  // Find the native binary
  const sourceBinary = findNativeBinary(packageName, binaryName);
  if (!sourceBinary) {
    console.error(`❌ Could not find native module. Make sure imgkit is installed.`);
    process.exit(1);
  }
  console.log(`✓ Found: ${sourceBinary}`);

  // Get output directory from args
  const outfile = parseOutfile(args);
  if (!outfile) {
    console.error(`❌ Please specify --outfile`);
    process.exit(1);
  }

  const outDir = dirname(outfile);

  // Run bun build
  console.log(`\n📦 Building executable...\n`);
  const result = spawnSync("bun", ["build", ...args], {
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n❌ Build failed`);
    process.exit(result.status || 1);
  }

  // Create output directory if needed
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Copy native module
  const destBinary = join(outDir, binaryName);
  copyFileSync(sourceBinary, destBinary);
  console.log(`\n✓ Copied native module to: ${destBinary}`);

  console.log(`
✅ Build complete!

Output:
  ${outDir}/
  ├── ${basename(outfile)}
  └── ${binaryName}

Run your app:
  ./${outfile}
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
