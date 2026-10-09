import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    watch: process.platform === "win32" ? { usePolling: true, interval: 500 } : undefined,
    proxy: { "/api": process.env.API_PROXY_TARGET || "http://127.0.0.1:4000" },
  },
});
