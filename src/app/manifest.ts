import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SabbathLink",
    short_name: "SabbathLink",
    description: "Your church, every Sabbath. Nearer to Thee.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F6F2",
    theme_color: "#0F4C5C",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
