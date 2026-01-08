/**
 * Native binding loader for bun-image-turbo
 *
 * Handles platform-specific binary loading for different OS/architectures.
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Get current directory for ESM
 */
export function getCurrentDir(): string {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return __dirname;
  }
}

/**
 * Load the native binding for the current platform
 */
export function loadNativeBinding(): any {
  const platform = process.platform;
  const arch = process.arch;

  // Map to napi-rs target names
  let targetName: string;
  switch (platform) {
    case "darwin":
      targetName = arch === "arm64" ? "darwin-arm64" : "darwin-x64";
      break;
    case "linux":
      // Check for musl vs glibc
      const isMusl =
        existsSync("/etc/alpine-release") ||
        process.env.npm_config_libc === "musl";
      if (arch === "arm64") {
        targetName = isMusl ? "linux-arm64-musl" : "linux-arm64-gnu";
      } else {
        targetName = isMusl ? "linux-x64-musl" : "linux-x64-gnu";
      }
      break;
    case "win32":
      targetName = arch === "arm64" ? "win32-arm64-msvc" : "win32-x64-msvc";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  const currentDir = getCurrentDir();
  const binaryName = `image-turbo.${targetName}.node`;
  const optionalPackageName = `bun-image-turbo-${targetName}`;

  // Try loading from different locations
  const possiblePaths = [
    // Same directory as this file (dist/)
    join(currentDir, binaryName),
    // Parent directory (package root)
    join(currentDir, "..", binaryName),
    // Optional dependency package (installed in node_modules)
    join(currentDir, "..", "..", optionalPackageName, binaryName),
    // CWD (development)
    join(process.cwd(), binaryName),
  ];

  for (const modulePath of possiblePaths) {
    try {
      if (existsSync(modulePath)) {
        return require(modulePath);
      }
    } catch {
      continue;
    }
  }

  // Try requiring the optional package directly (Bun/Node resolution)
  try {
    return require(optionalPackageName);
  } catch {
    // Ignore and fall through to error
  }

  throw new Error(
    `Failed to load native binding for ${platform}-${arch}. ` +
      `Tried: ${possiblePaths.join(", ")}`
  );
}

// Load and export native bindings
export const native = loadNativeBinding();
