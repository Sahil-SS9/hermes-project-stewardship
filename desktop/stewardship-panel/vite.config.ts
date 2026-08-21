import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev proxy to the stewardship RPC (uvicorn on :9310)
      "/stewardship": "http://127.0.0.1:9310",
    },
  },
  build: { outDir: "dist" },
});
