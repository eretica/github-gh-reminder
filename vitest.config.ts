import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", "out"],
    setupFiles: ["./src/setupTests.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", "out", "**/*.test.ts", "**/*.test.tsx"],
    },
    // Use different environments based on file location
    environmentMatchGlobs: [
      ["src/renderer/**/*.test.tsx", "jsdom"],
      ["src/main/**/*.test.ts", "node"],
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
