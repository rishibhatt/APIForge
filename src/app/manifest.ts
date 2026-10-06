import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APIForge: OpenAPI & Swagger Workspace",
    short_name: "APIForge",
    description:
      "Free online OpenAPI and Swagger validator, API tester, and 0–100 quality score. Runs in the browser, no account.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#131315",
    theme_color: "#131315",
    categories: ["developer", "productivity", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
