import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APIForge — AI-Powered OpenAPI & Swagger Workspace",
    short_name: "APIForge",
    description:
      "Parse OpenAPI and Swagger specs, audit API quality, and generate TypeScript clients and tests with AI intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0814",
    theme_color: "#d0bcff",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
