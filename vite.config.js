import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:4173" }
  },
  build: {
    outDir: "../public",
    emptyOutDir: true
  }
});
