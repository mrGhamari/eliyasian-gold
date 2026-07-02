"use client";

import type { DisplayItem } from "@/lib/pricing/engine";
import { formatRialsAsToman } from "@/lib/pricing/money";
import { FlashValue } from "./FlashValue";
import { FreezeBanner } from "./FreezeBanner";

function BigPrice({ label, rials }: { label: string; rials: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-2xl font-bold text-neutral-900 sm:text-4xl">
        <FlashValue value={formatRialsAsToman(rials)} />
      </span>
      <span className="text-xs text-neutral-400">تومان</span>
    </div>
  );
}

/** Hero card: Elyasian buy/sell for 18-karat gold, or the freeze banner. */
export function PriceCard({
  item,
  frozen,
  badge,
}: {
  item: DisplayItem | undefined;
  frozen: boolean;
  badge: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="hero-title"
      className="rounded-2xl border border-gold-100 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="hero-title" className="text-lg font-bold text-gold-700">
          گرم طلای ۱۸ عیار
        </h2>
        {badge}
      </div>

      {frozen ? (
        <FreezeBanner />
      ) : item?.elyasianSellRials !== undefined &&
        item?.elyasianBuyRials !== undefined ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="min-w-0 rounded-xl bg-gold-50 py-5">
            <BigPrice label="قیمت فروش" rials={item.elyasianSellRials} />
          </div>
          <div className="min-w-0 rounded-xl bg-neutral-50 py-5">
            <BigPrice label="قیمت خرید" rials={item.elyasianBuyRials} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-busy="true">
          {["قیمت فروش", "قیمت خرید"].map((label) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl bg-neutral-50 py-5"
            >
              <span className="text-sm text-neutral-500">{label}</span>
              <span className="h-9 w-32 animate-pulse rounded bg-neutral-200 sm:h-10" />
              <span className="text-xs text-neutral-400">در حال دریافت قیمت…</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
