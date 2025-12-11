# Installation

## Package Managers

::: code-group

```bash [bun]
bun add bun-image-turbo
```

```bash [npm]
npm install bun-image-turbo
```

```bash [yarn]
yarn add bun-image-turbo
```

```bash [pnpm]
pnpm add bun-image-turbo
```

:::

## Requirements

- **Bun** 1.0+ or **Node.js** 18+
- No additional dependencies required (prebuilt binaries included)

## Supported Platforms

Prebuilt binaries are available for:

| Platform | Architecture | HEIC Support |
|----------|--------------|:------------:|
| macOS | ARM64 (M1/M2/M3/M4/M5)  | ✅ |
| macOS | x64 (Intel) | ❌ |
| Linux | x64 (glibc) | ❌ |
| Linux | x64 (musl/Alpine) | ❌ |
| Linux | ARM64 (glibc) | ❌ |
| Linux | ARM64 (musl) | ❌ |
| Windows | x64 | ❌ |

::: tip HEIC Support
HEIC/HEIF support is currently available on **macOS ARM64** only. This is due to libheif dependency requirements. Other platforms can still process all other image formats.
:::

## Verifying Installation

```typescript
import { version, metadata } from 'bun-image-turbo';

// Check version
console.log(`bun-image-turbo v${version()}`);

// Test with an image
const buffer = await Bun.file('image.jpg').arrayBuffer();
const info = await metadata(Buffer.from(buffer));
console.log(info);
```

## Building from Source

If you need to build from source (requires Rust 1.70+):

```bash
# Clone the repository
git clone https://github.com/nexus-aissam/bun-image-turbo.git
cd bun-image-turbo

# Install dependencies
bun install

# Build native module
bun run build

# Build TypeScript
bun run build:ts
```

### Build Requirements

- Rust 1.70+
- NASM (for TurboJPEG SIMD)
- CMake 3.10+
- C/C++ compiler

::: details macOS Build Dependencies

```bash
brew install nasm cmake
```

:::

::: details Linux Build Dependencies

```bash
# Ubuntu/Debian
sudo apt-get install nasm cmake build-essential

# Fedora
sudo dnf install nasm cmake gcc-c++
```

:::
