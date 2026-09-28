import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Static content: nothing here depends on runtime env.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  // Relative URLs resolve against the manifest's own location, so they work
  // both at a domain root and under the GitHub Pages basePath.
  return {
    name: SITE_NAME,
    short_name: "الیاسیان",
    description: SITE_DESCRIPTION,
    lang: "fa-IR",
    dir: "rtl",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#c9a227",
    icons: [
      { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
