import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Rutas relativas: el sitio funciona igual en la raíz (Cloudflare Pages) o en un subdirectorio (GitHub Pages).
  base: "./",
  plugins: [
    preact(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      injectManifest: { globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"], globIgnores: ["**/capturas/**"] },
      manifest: {
        name: "Entre Campus · Bus interno UNA",
        short_name: "Entre Campus",
        description: "Horario y próxima salida del bus interno entre el Campus Omar Dengo y el Campus Benjamín Núñez. Proyecto no oficial.",
        lang: "es-CR",
        dir: "ltr",
        start_url: "./",
        scope: "./",
        id: "./",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0b6e69",
        background_color: "#f4f6f5",
        categories: ["travel", "education"],
        icons: [
          { src: "icons/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icons/icono.svg", sizes: "any", type: "image/svg+xml" },
        ],
        shortcuts: [
          { name: "Horarios", url: "./#/horarios" },
          { name: "Paradas", url: "./#/paradas" },
        ],
      },
    }),
  ],
  test: { include: ["tests/unit/**/*.test.ts"] },
});
