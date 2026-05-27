import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: {
        preset: "vercel",
      },
      importProtection: {
        enabled: false,
      },
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
