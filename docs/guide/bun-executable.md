# Bun Single-File Executables

imgkit fully supports Bun's single-file executable compilation (`bun build --compile`). This guide explains how to build standalone executables that include imgkit.

## The Challenge

When you compile a Bun application with `bun build --compile`, Bun creates a single executable that bundles your JavaScript/TypeScript code. However, native `.node` modules (like imgkit's Rust bindings) cannot be embedded inside this executable because they are dynamic libraries that the operating system must load separately.

This is a fundamental limitation shared by all native Node.js addons (Sharp, Prisma, etc.) when used with Bun executables.

## Solution: imgkit-build CLI

imgkit provides the `imgkit-build` command that automates the entire process:

```bash
bunx imgkit-build --compile --outfile dist/app src/index.ts
```

This single command:
1. Runs `bun build --compile` with your entry point
2. Automatically locates the correct native module for your platform
3. Copies the `.node` file next to your executable

### Usage

```bash
# Basic usage
bunx imgkit-build --compile --outfile dist/myapp src/index.ts

# With additional Bun flags
bunx imgkit-build --compile --outfile dist/myapp --minify src/index.ts

# Show help
bunx imgkit-build --help
```

### Output Structure

After running `imgkit-build`, your output directory will contain:

```
dist/
├── myapp                              # Your executable
└── image-turbo.darwin-arm64.node      # Native module (platform-specific)
```

## How It Works

### At Build Time

1. `imgkit-build` wraps `bun build --compile` with all your arguments
2. After compilation, it finds the native module in `node_modules/imgkit-{platform}/`
3. Copies the `.node` file to the same directory as your executable

### At Runtime

When your executable runs, imgkit's loader:
1. Detects it's running inside a Bun single-file executable (via `$bunfs` filesystem)
2. Uses `process.execPath` to find the real path of your executable
3. Searches for the native module in the executable's directory
4. Loads the native module and your app runs normally

## Manual Setup (Alternative)

If you prefer not to use `imgkit-build`, you can manually copy the native module:

```bash
# 1. Build your executable
bun build --compile --outfile dist/myapp src/index.ts

# 2. Copy the native module (example for macOS ARM64)
cp node_modules/imgkit-darwin-arm64/image-turbo.darwin-arm64.node dist/
```

### Platform-Specific Module Names

| Platform | Package | Binary Name |
|----------|---------|-------------|
| macOS ARM64 | `imgkit-darwin-arm64` | `image-turbo.darwin-arm64.node` |
| macOS x64 | `imgkit-darwin-x64` | `image-turbo.darwin-x64.node` |
| Linux x64 (glibc) | `imgkit-linux-x64-gnu` | `image-turbo.linux-x64-gnu.node` |
| Linux x64 (musl) | `imgkit-linux-x64-musl` | `image-turbo.linux-x64-musl.node` |
| Linux ARM64 | `imgkit-linux-arm64-gnu` | `image-turbo.linux-arm64-gnu.node` |
| Windows x64 | `imgkit-windows-x64` | `image-turbo.win32-x64-msvc.node` |
| Windows ARM64 | `imgkit-windows-arm64` | `image-turbo.win32-arm64-msvc.node` |

## Custom Native Path

You can specify a custom location for the native module using environment variables:

```bash
# imgkit-specific
IMGKIT_NATIVE_PATH=/path/to/image-turbo.darwin-arm64.node ./myapp

# Or NAPI-RS standard
NAPI_RS_NATIVE_LIBRARY_PATH=/path/to/image-turbo.darwin-arm64.node ./myapp
```

## Deployment

When deploying your executable:

1. **Copy both files** - The executable and the `.node` file must be in the same directory
2. **Match the platform** - Use the correct `.node` file for your target OS/architecture
3. **Set permissions** - Ensure both files are executable on Unix systems

### Docker Example

```dockerfile
FROM oven/bun:1 as builder
WORKDIR /app
COPY . .
RUN bun install
RUN bunx imgkit-build --compile --outfile dist/app src/index.ts

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/dist/app .
COPY --from=builder /app/dist/*.node .
CMD ["./app"]
```

## Troubleshooting

### "Failed to load native binding" Error

This error means the native module wasn't found. Check:

1. The `.node` file is in the same directory as your executable
2. The `.node` file matches your platform (e.g., `darwin-arm64` for M1 Mac)
3. File permissions allow reading the `.node` file

### Wrong Platform Module

If you see architecture mismatch errors, ensure you're using the correct native module for your target platform. Cross-compilation requires the target platform's native module.

## FAQ

### Why can't native modules be embedded?

Native `.node` files are dynamic libraries (`.dylib` on macOS, `.so` on Linux, `.dll` on Windows). The operating system's dynamic linker must load them from the filesystem - they cannot be loaded from memory or a virtual filesystem.

### Does this affect development?

No. During development with `bun run` or `bun test`, imgkit loads normally from `node_modules`. The special handling only applies to compiled executables.

### What about Sharp?

Sharp has the same limitation with Bun executables. The `imgkit-build` approach is similar to what Sharp users must do manually.
