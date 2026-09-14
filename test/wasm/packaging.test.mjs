/**
 * Packaging tests for the WebAssembly build (issue #12).
 *
 * These exist because the other suites all run *inside* the repo, where every
 * devDependency is installed and every file is on disk. That hid two real bugs
 * that would only appear for someone who ran `npm install imgkit`:
 *
 *   1. wasm/image-turbo.wasi.cjs require()s @napi-rs/wasm-runtime and
 *      @emnapi/runtime at load time, but they were devDependencies, so the
 *      fallback threw "Cannot find module" on a published install.
 *   2. the published tarball carried a 3.2 MB debug .wasm nothing loads.
 *
 * They are static checks against package.json and the generated loader, so they
 * need no network and no npm install.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WASM_DIR = join(ROOT, "wasm");

let pkg;

before(() => {
  pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
});

describe("packaging", () => {
  describe("runtime dependencies", () => {
    it("declares every module the wasm loader requires as a real dependency", () => {
      const loader = join(WASM_DIR, "image-turbo.wasi.cjs");
      if (!existsSync(loader)) return; // not built; wasm.test.ts reports that

      const src = readFileSync(loader, "utf8");
      const required = new Set();
      for (const m of src.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
        const id = m[1];
        if (id.startsWith(".") || id.startsWith("node:")) continue;
        // scoped package -> @scope/name, plain -> name
        required.add(id.startsWith("@") ? id.split("/").slice(0, 2).join("/") : id.split("/")[0]);
      }

      assert.ok(required.size > 0, "expected the loader to require something");

      const deps = pkg.dependencies ?? {};
      const devDeps = pkg.devDependencies ?? {};
      for (const id of required) {
        assert.ok(
          id in deps,
          `${id} is require()d by wasm/image-turbo.wasi.cjs at load time, so it ` +
            `must be in "dependencies". Currently: ${
              id in devDeps ? '"devDependencies"' : "not declared at all"
            }. A published install would throw "Cannot find module '${id}'".`
        );
      }
    });

    it("keeps the build-only emnapi archives out of runtime dependencies", () => {
      // `emnapi` ships the .a files consumed at link time only; shipping it as a
      // runtime dep would add weight users never load.
      assert.ok(!("emnapi" in (pkg.dependencies ?? {})));
      assert.ok("emnapi" in (pkg.devDependencies ?? {}));
    });
  });

  describe("published files", () => {
    it("ships the wasm module and its loaders", () => {
      const files = pkg.files ?? [];
      const joined = files.join("\n");
      assert.ok(joined.includes("image-turbo.wasm32-wasi.wasm"), "wasm module must ship");
      assert.ok(joined.includes("image-turbo.wasi.cjs"), "node loader must ship");
      assert.ok(files.includes("dist"), "dist must ship");
    });

    it("does not ship the debug wasm", () => {
      // Same bytes as the release module plus DWARF - it doubled the tarball.
      const files = pkg.files ?? [];
      assert.ok(
        !files.some((f) => f.includes("debug.wasm")),
        "the debug .wasm must not be published"
      );
      assert.ok(
        !files.some((f) => f === "wasm" || f === "wasm/"),
        'publishing the whole "wasm" directory would sweep in the debug .wasm'
      );
    });
  });

  describe("entry points", () => {
    it("does not advertise a browser entry that bypasses the TS layer", () => {
      // napi generates wasm/browser.js as `export * from 'imgkit-wasm32-wasi'`,
      // a package this repo does not publish, and it would skip the option
      // converters and the async shim. Until a real browser entry exists, no
      // browser condition should be advertised.
      assert.equal(pkg.browser, undefined);
      assert.equal(pkg.exports?.["."]?.browser, undefined);
    });

    it("keeps the documented main entry points intact", () => {
      assert.equal(pkg.exports["."].import.default, "./dist/index.mjs");
      assert.equal(pkg.exports["."].require.default, "./dist/index.js");
    });
  });

  describe("version consistency", () => {
    it("matches the crate version", () => {
      const cargo = readFileSync(join(ROOT, "Cargo.toml"), "utf8");
      const m = cargo.match(/^version\s*=\s*"([^"]+)"/m);
      assert.ok(m, "Cargo.toml has a package version");
      assert.equal(m[1], pkg.version, "Cargo.toml and package.json versions must match");
    });

    it("pins optionalDependencies to the current version", () => {
      for (const [name, range] of Object.entries(pkg.optionalDependencies ?? {})) {
        assert.equal(
          range,
          `^${pkg.version}`,
          `${name} should track the package version`
        );
      }
    });
  });
});
