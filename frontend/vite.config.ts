import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Tests run in jsdom, a simulated browser
  test: { environment: "jsdom" },
  server: {
    port: 3000,
    // Forward /api/* to the backend, so the browser only talks to one origin (no CORS needed)
    proxy: {
      "/api": {
        // 127.0.0.1 rather than localhost: Node may resolve localhost to IPv6 (::1), but uvicorn listens on IPv4
        target: "http://127.0.0.1:8000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
