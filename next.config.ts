import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Standard App Router configuration */
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
