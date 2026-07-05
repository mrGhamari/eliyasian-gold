/**
 * Normalized domain types shared by every price provider.
 *
 * Money convention (locked decision):
 * - IRR amounts are ALWAYS integer rials. Providers normalize at their boundary.
 * - USD amounts are ALWAYS integer cents (to keep all price math integer-only).
 * - The display layer converts rials -> toman (1 toman = 10 rials) with fa-IR
 *   formatting. No floating-point price math anywhere.
 */

export const ITEM_KEYS = [
  "gold_18",
  "coin_emami",
  "coin_half",
  "coin_quarter",
  "ounce_global",
] as const;

export type ItemKey = (typeof ITEM_KEYS)[number];

export function isItemKey(value: string): value is ItemKey {
  return (ITEM_KEYS as readonly string[]).includes(value);
}

/** Persian labels for each internal item key. */
export const ITEM_LABELS: Record<ItemKey, string> = {
  gold_18: "گرم طلای ۱۸ عیار",
  coin_emami: "سکه امامی",
  coin_half: "نیم‌سکه",
  coin_quarter: "ربع‌سکه",
  ounce_global: "انس جهانی",
};

export type Currency = "IRR" | "USD";

export interface MarketItem {
  key: ItemKey;
  currency: Currency;
  /** Integer rials when currency === "IRR"; integer US cents when currency === "USD". */
  amount: number;
}

export interface MarketSnapshot {
  items: MarketItem[];
  /** ISO timestamp of the moment the provider successfully fetched upstream. */
  fetchedAt: string;
  source: string;
  /** Present and true only for the mock provider. */
  mock?: boolean;
  /**
   * True when the upstream platform has halted trading (buy or sell) and its
   * quoted price should not be sold against. The pricing engine treats this
   * exactly like PRICE_FREEZE: Elyasian prices are withheld and the freeze
   * banner is shown, while market data stays visible.
   */
  upstreamFrozen?: boolean;
}

export interface PriceProvider {
  readonly name: string;
  fetchMarketSnapshot(): Promise<MarketSnapshot>;
}
