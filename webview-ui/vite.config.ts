import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../dist/webview",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-markdown": ["react-markdown", "remark-gfm", "rehype-highlight"],
          "vendor-table": ["@tanstack/react-table"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
});
