import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "diagnostics/index": "src/diagnostics/index.ts",
    "logging/index": "src/logging/index.ts",
    "tracing/index": "src/tracing/index.ts",
    "http/index": "src/http/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
