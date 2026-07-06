import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir imágenes de dominios externos para NewsData.io
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Variables de entorno del servidor disponibles en runtime
  env: {
    NEWSDATA_API_KEY: process.env.NEWSDATA_API_KEY,
    NEWSDATA_API_URL: process.env.NEWSDATA_API_URL,
  },
};

export default nextConfig;
