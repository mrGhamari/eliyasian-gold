import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

// Vazirmatn self-hosted via next/font (files committed under src/fonts) —
// no external font CDN, display: swap.
const vazirmatn = localFont({
  src: [
    { path: "../fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-vazirmatn",
});

// Render every page at request time. A static prerender would run at `next
// build`, where the runtime env (PRICE_PROVIDER, SITE_URL, …) is absent:
// the HTML would ship build-time prices and localhost canonical/OG URLs.
export const dynamic = "force-dynamic";

/**
 * Search-engine ownership verification tokens (the `content` value of the
 * meta tag each console gives you). Unset = no tag. Read at build time for
 * the static export, at request time for the server build.
 */
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  // Origin only: file-based metadata (OG/Twitter images) already carries any
  // basePath, so a path here would be applied twice. Page URLs are absolute.
  metadataBase: new URL(new URL(SITE_URL).origin),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: `${SITE_URL}/` },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/`,
    siteName: SITE_NAME,
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  ...(googleVerification || bingVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification
            ? { other: { "msvalidate.01": bingVerification } }
            : {}),
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#c9a227",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
