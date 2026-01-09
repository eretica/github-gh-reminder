import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import type { Plugin } from "vite";

// Plugin to copy migrations folder to build output
function copyMigrationsPlugin(): Plugin {
  return {
    name: "copy-migrations",
    closeBundle() {
      const sourceDir = resolve(__dirname, "src/main/db/migrations");
      const targetDir = resolve(__dirname, "out/main/db/migrations");

      // Copy migration files
      const files = [
        "0000_initial_schema.sql",
        "meta/0000_snapshot.json",
        "meta/_journal.json",
      ];

      for (const file of files) {
        const source = resolve(sourceDir, file);
        const target = resolve(targetDir, file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(source, target);
      }
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMigrationsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
      },
    },
    plugins: [react()],
  },
});
