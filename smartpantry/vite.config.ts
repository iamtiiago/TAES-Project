
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",

      manifest: {
        name: "SmartPantry",
        short_name: "SmartPantry",
        description: "Gestão de alimentos e despensa",
        theme_color: "#2458a6",
        background_color: "#f5f5f5",
        display: "standalone",
        start_url: "/",
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}"
        ],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
});
