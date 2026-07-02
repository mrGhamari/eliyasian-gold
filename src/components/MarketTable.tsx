"use client";

import type { DisplayItem } from "@/lib/pricing/engine";
import { formatRialsAsToman, formatUsdCents } from "@/lib/pricing/money";
import type { ItemKey } from "@/lib/providers/types";
import { FlashValue } from "./FlashValue";

const MARKET_KEYS: ItemKey[] = [
  "coin_emami",
  "coin_half",
  "coin_quarter",
  "ounce_global",
];

function marketValue(item: DisplayItem): { value: string; unit: string } {
  if (item.currency === "USD") {
    return { value: formatUsdCents(item.marketAmount), unit: "" };
  }
  return { value: formatRialsAsToman(item.marketAmount), unit: "تومان" };
}

/** Market-info section: سکه امامی، نیم‌سکه، ربع‌سکه، انس جهانی. */
export function MarketTable({ items }: { items: DisplayItem[] }) {
  const rows = MARKET_KEYS.map((key) =>
    items.find((item) => item.key === key),
  ).filter((item): item is DisplayItem => item !== undefined);

  return (
    <section aria-labelledby="market-title" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 id="market-title" className="mb-4 text-lg font-bold text-neutral-800">
        نرخ بازار
      </h2>
      {rows.length === 0 ? (
        <ul className="divide-y divide-neutral-100" aria-busy="true">
          {MARKET_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between py-3">
              <span className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
              <span className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {rows.map((item) => {
            const { value, unit } = marketValue(item);
            return (
              <li
                key={item.key}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="text-neutral-700">{item.label}</span>
                <span className="font-medium text-neutral-900">
                  <FlashValue value={value} />
                  {unit && (
                    <span className="mr-1 text-xs text-neutral-400">{unit}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
