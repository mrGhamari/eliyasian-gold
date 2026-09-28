import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Built per request so the runtime SITE_URL is used, not the build env.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
