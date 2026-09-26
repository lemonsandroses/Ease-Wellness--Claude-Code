import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendors that change on a different cadence to app code, so a
        // release doesn't invalidate the whole cache. Matching on module path
        // rather than package name, which misses transitive deps like scheduler
        // and d3 and silently produces empty chunks.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) return "charts";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) return "react";
          if (id.includes("/motion") || id.includes("framer")) return "motion";
        },
      },
    },
  },
});
