import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    host: true,
    proxy: { "/api": "http://127.0.0.1:8100" },
  },
  preview: {
    port: 4180,
    proxy: { "/api": "http://127.0.0.1:8100" },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
