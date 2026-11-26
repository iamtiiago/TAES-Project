import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { recipeSuggestionApi } from "./server/recipeSuggestionApi.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
    recipeSuggestionApi(env.GEMINI_API_KEY, env.GEMINI_MODEL),
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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  };
});
