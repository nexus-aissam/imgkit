/**
 * Native binding loader for imgkit
 *
 * Handles platform-specific binary loading for different OS/architectures.
 * Supports both Node.js and Bun runtimes.
 */

// Declare Bun global for TypeScript
declare const Bun: unknown;

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// Detect Bun runtime
const isBun = typeof Bun !== "undefined";

// Detect Bun single-file executable (paths start with $bunfs or /$bunfs)
// Check multiple indicators since bundling can affect which ones are available
const isBunExecutable = isBun && (
  (typeof __dirname === "string" && __dirname.includes("$bunfs")) ||
  (typeof import.meta?.url === "string" && import.meta.url.includes("$bunfs")) ||
  (typeof import.meta?.dir === "string" && import.meta.dir.includes("$bunfs")) ||
  // Also detect if execPath differs from expected bun location (indicates compiled binary)
  (process.execPath && !process.execPath.includes("bun") && !process.execPath.includes("node"))
);

// Create require function that works in both ESM and CJS contexts
// Bun: Use globalThis.require which Bun provides for native module loading
// Node.js ESM: Use createRequire(import.meta.url)
// Node.js CJS: Use native require
const nativeRequire: NodeJS.Require | null = (() => {
  // Bun provides a global require that works with native modules
  if (isBun && typeof globalThis.require === "function") {
    return globalThis.require as NodeJS.Require;
  }
  // Node.js ESM context
  if (typeof import.meta?.url === "string") {
    return createRequire(import.meta.url);
  }
  // Node.js CJS context
  if (typeof require !== "undefined") {
    return require;
  }
  return null;
})();

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

  // Map to napi-rs target names and package names
  // Binary names follow napi-rs conventions, package names are simplified
  let targetName: string;
  let packageSuffix: string;
  switch (platform) {
    case "darwin":
      targetName = arch === "arm64" ? "darwin-arm64" : "darwin-x64";
      packageSuffix = targetName;
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
      packageSuffix = targetName;
      break;
    case "win32":
      // Binary uses win32-*-msvc, package uses windows-*
      targetName = arch === "arm64" ? "win32-arm64-msvc" : "win32-x64-msvc";
      packageSuffix = arch === "arm64" ? "windows-arm64" : "windows-x64";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  const currentDir = getCurrentDir();
  const binaryName = `image-turbo.${targetName}.node`;
  const optionalPackageName = `imgkit-${packageSuffix}`;

  const errors: string[] = [];

  // Strategy 0: Check for custom native library path (env variable)
  // Supports both NAPI-RS standard and imgkit-specific env vars
  const customPath = process.env.IMGKIT_NATIVE_PATH || process.env.NAPI_RS_NATIVE_LIBRARY_PATH;
  if (customPath) {
    try {
      if (existsSync(customPath)) {
        return nativeRequire!(customPath);
      }
      errors.push(`Custom path ${customPath}: File not found`);
    } catch (e) {
      errors.push(`Custom path ${customPath}: ${(e as Error).message}`);
    }
  }

  // Try loading from different locations
  const possiblePaths = [
    // Same directory as this file (dist/)
    join(currentDir, binaryName),
    // Parent directory (package root)
    join(currentDir, "..", binaryName),
    // Optional dependency package (installed in node_modules)
    join(currentDir, "..", "..", optionalPackageName, binaryName),
    // CWD (development or Bun executable)
    join(process.cwd(), binaryName),
    // Executable directory (for Bun single-file builds)
    join(process.cwd(), "node_modules", optionalPackageName, binaryName),
  ];

  // For Bun executables, prioritize the directory containing the executable
  // This allows users to simply place the .node file next to their compiled binary
  // In Bun executables, process.execPath gives the real path to the binary
  if (isBun && process.execPath && !process.execPath.includes("$bunfs")) {
    const execDir = dirname(process.execPath);
    // Add these at the BEGINNING for priority
    possiblePaths.unshift(
      join(execDir, binaryName),
      join(execDir, "native", binaryName),
      join(execDir, "lib", binaryName),
    );
  }

  // Strategy 1: Try requiring the optional package directly first (works best in Bun)
  // Bun's module resolution handles optional dependencies well
  if (isBun) {
    try {
      return nativeRequire!(optionalPackageName);
    } catch (e) {
      errors.push(`Package ${optionalPackageName}: ${(e as Error).message}`);
    }
  }

  // Strategy 2: Try loading from file paths
  for (const modulePath of possiblePaths) {
    try {
      if (existsSync(modulePath)) {
        return nativeRequire!(modulePath);
      }
    } catch (e) {
      errors.push(`Path ${modulePath}: ${(e as Error).message}`);
      continue;
    }
  }

  // Strategy 3: Try requiring the optional package directly (Node.js fallback)
  if (!isBun) {
    try {
      return nativeRequire!(optionalPackageName);
    } catch (e) {
      errors.push(`Package ${optionalPackageName}: ${(e as Error).message}`);
    }
  }

  // Strategy 4 (Bun only): Try using Bun's plugin system for native modules
  if (isBun) {
    for (const modulePath of possiblePaths) {
      try {
        if (existsSync(modulePath)) {
          // Use dynamic import with file:// URL for Bun
          const module = require(modulePath);
          if (module) return module;
        }
      } catch (e) {
        errors.push(`Bun require ${modulePath}: ${(e as Error).message}`);
        continue;
      }
    }
  }

  // Build helpful error message
  let errorMsg = `Failed to load native binding for ${platform}-${arch}.\n` +
    `Runtime: ${isBun ? "Bun" : "Node.js"}${isBunExecutable ? " (single-file executable)" : ""}\n` +
    `Tried paths: ${possiblePaths.join(", ")}\n` +
    `Errors:\n${errors.map((e) => `  - ${e}`).join("\n")}`;

  // Add specific guidance for Bun single-file executables
  if (isBunExecutable) {
    errorMsg += `\n\n` +
      `════════════════════════════════════════════════════════════════\n` +
      `         Bun Single-File Executable Detected                    \n` +
      `════════════════════════════════════════════════════════════════\n\n` +
      `Use imgkit-build to automatically handle native modules:\n\n` +
      `  bunx imgkit-build --compile --outfile dist/app src/index.ts\n\n` +
      `Or manually copy the native module:\n\n` +
      `  cp node_modules/${optionalPackageName}/${binaryName} dist/\n\n` +
      `imgkit will automatically find it next to your executable.`;
  }

  throw new Error(errorMsg);
}

// Load and export native bindings
export const native = loadNativeBinding();
