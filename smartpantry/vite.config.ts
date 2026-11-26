import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { createRecipeSuggestionHandler } from "./server/recipeSuggestion.ts";
import { recipeSuggestionPath } from "./src/shared/recipeSuggestion.ts";

function recipeSuggestionApi(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), "GEMINI_");
  const handler = createRecipeSuggestionHandler(
    env.GEMINI_API_KEY?.trim(),
    env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
  );

  function attach({ middlewares }: ViteDevServer | PreviewServer) {
    middlewares.use((request, response, next) => {
      if (request.url?.split("?", 1)[0] !== recipeSuggestionPath) return next();
      void handler(request, response).catch(next);
    });
  }

  return { name: "recipe-suggestion-api", configureServer: attach, configurePreviewServer: attach };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    recipeSuggestionApi(mode),
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
}));
