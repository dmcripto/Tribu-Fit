import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite compilar una copia aparte para pruebas (NEXT_DIST_DIR=.next-prueba).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
