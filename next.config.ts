import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite compilar una copia aparte para pruebas (NEXT_DIST_DIR=.next-prueba).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Dirección corta y estable para el código QR (también el impreso en remeras).
  async redirects() {
    return [{ source: "/app", destination: "/descargar", permanent: false }];
  },
  async headers() {
    const seguridad = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    return [
      { source: "/(.*)", headers: seguridad },
      {
        source: "/tribu-fit.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: 'attachment; filename="tribu-fit.apk"' },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
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
