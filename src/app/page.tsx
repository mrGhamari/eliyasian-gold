import { ContactCard } from "@/components/ContactCard";
import { Disclaimer } from "@/components/Disclaimer";
import { PriceBoard } from "@/components/PriceBoard";
import { getPrices } from "@/lib/prices";
import { buildJsonLd, formatPersianDate, jsonLdScript } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

// Rendered per request (see `dynamic` in layout.tsx), so the HTML always
// carries current price digits (SEO) and nothing is baked in at build time.
// getPrices() serves from its 60s in-memory cache, so traffic never multiplies
// upstream calls.

export default async function Home() {
  const initialData = await getPrices();
  const today = formatPersianDate(new Date());
  const jsonLd = buildJsonLd({ dateModified: initialData.snapshot?.fetchedAt });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gold-100 bg-white">
        <div className="mx-auto w-full max-w-xl px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            قیمت طلا امروز در {SITE_NAME}
          </h1>
          <p className="mt-2 text-sm text-gold-600">
            {today} · نرخ لحظه‌ای خرید و فروش طلای ۱۸ عیار
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <div className="flex flex-col gap-6">
          <PriceBoard initialData={initialData} />
          <ContactCard />
          <section
            aria-labelledby="about-title"
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <h2 id="about-title" className="mb-3 text-lg font-bold text-neutral-800">
              درباره {SITE_NAME}
            </h2>
            <p className="text-sm leading-7 text-neutral-700">
              {SITE_NAME} در قلب بازار طلای تهران، خیابان پانزده خرداد شرقی و
              رو به روی بازار زرگرها قرار دارد. در این صفحه قیمت خرید و فروش
              هر گرم طلای ۱۸ عیار در فروشگاه، بر اساس نرخ لحظه‌ای بازار و به‌صورت
              خودکار به‌روزرسانی می‌شود. برای استعلام نهایی پیش از خرید یا فروش،
              با فروشگاه تماس بگیرید یا با دکمه‌های مسیریابی به فروشگاه بیایید.
            </p>
          </section>
        </div>
      </main>

      <Disclaimer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
    </div>
  );
}
