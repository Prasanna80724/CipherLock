import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    host: true, // enable access from LAN/public IP
    allowedHosts: ['.ngrok-free.app'], // allow ngrok subdomains
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "robots.txt",
        "icons/*",
        "/lock-banner.png",
        "/private-data.png"
      ],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "CipherLock",
        short_name: "CipherLock",
        description: "Secure your notes and passwords offline.",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/logo_192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/logo_512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/logo_512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
