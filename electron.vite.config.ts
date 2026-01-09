import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import type { Plugin } from "vite";

// Plugin to copy migrations folder to build output
// This recursively copies all migration files to ensure new migrations are included
function copyMigrationsPlugin(): Plugin {
  return {
    name: "copy-migrations",
    closeBundle() {
      const sourceDir = resolve(__dirname, "src/main/db/migrations");
      const targetDir = resolve(__dirname, "out/main/db/migrations");

      // Recursively copy all files in migrations directory
      function copyDir(src: string, dest: string): void {
        mkdirSync(dest, { recursive: true });
        const entries = readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
          const srcPath = resolve(src, entry.name);
          const destPath = resolve(dest, entry.name);

          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
          }
        }
      }

      copyDir(sourceDir, targetDir);
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
