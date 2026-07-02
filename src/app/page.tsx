import { Disclaimer } from "@/components/Disclaimer";
import { PriceBoard } from "@/components/PriceBoard";
import { getPrices } from "@/lib/prices";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// ISR: rendered HTML always contains real price digits (SEO requirement) and
// regenerates at most once per 60s regardless of traffic.
export const revalidate = 60;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      "@type": "WebSite",
      name: "قیمت طلا الیاسیان",
      url: SITE_URL,
      inLanguage: "fa-IR",
    },
  ],
};

export default async function Home() {
  const initialData = await getPrices();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gold-100 bg-white">
        <div className="mx-auto w-full max-w-xl px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            قیمت طلا الیاسیان
          </h1>
          <p className="mt-2 text-sm text-gold-600">نرخ لحظه‌ای طلا و سکه</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <PriceBoard initialData={initialData} />
      </main>

      <Disclaimer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
