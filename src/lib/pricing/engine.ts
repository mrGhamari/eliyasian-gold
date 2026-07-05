import type { Currency, ItemKey, MarketSnapshot } from "@/lib/providers/types";
import { ITEM_LABELS } from "@/lib/providers/types";
import { roundToNearestRials } from "./money";
import type { PricingRules } from "./rules";

/**
 * Pricing engine: market snapshot + rules -> display snapshot.
 * Pure and synchronous — all integer math, fully unit-tested.
 */

export interface DisplayItem {
  key: ItemKey;
  label: string;
  currency: Currency;
  /** Market rate: integer rials (IRR) or integer US cents (USD). */
  marketAmount: number;
  /**
   * Elyasian shop prices in integer rials. Present only for items listed in
   * PRICE_ADJ_ITEMS and only when prices are not frozen. Buy and sell are
   * currently identical by explicit business decision, but modeled as
   * separate fields because they are expected to diverge later.
   */
  elyasianSellRials?: number;
  elyasianBuyRials?: number;
}

export interface DisplaySnapshot {
  items: DisplayItem[];
  /** ISO timestamp of the last SUCCESSFUL upstream fetch (not render time). */
  fetchedAt: string;
  source: string;
  mock?: boolean;
  /** true => Elyasian prices are withheld and the freeze banner is shown. */
  frozen: boolean;
}

export function applyPricing(
  snapshot: MarketSnapshot,
  rules: PricingRules,
): DisplaySnapshot {
  // Manual freeze (PRICE_FREEZE) and upstream trading halt behave identically.
  const frozen = rules.freeze || snapshot.upstreamFrozen === true;

  const items: DisplayItem[] = snapshot.items.map((item) => {
    const display: DisplayItem = {
      key: item.key,
      label: ITEM_LABELS[item.key],
      currency: item.currency,
      marketAmount: item.amount,
    };

    const isAdjusted =
      item.currency === "IRR" && rules.adjustmentItems.includes(item.key);

    if (isAdjusted && !frozen) {
      const nearest = rules.rounding.perItem[item.key] ?? rules.rounding.default;
      const priced = roundToNearestRials(
        item.amount + rules.adjustmentRials,
        nearest,
      );
      // Identical today by business decision; kept as two fields on purpose.
      display.elyasianSellRials = priced;
      display.elyasianBuyRials = priced;
    }

    return display;
  });

  return {
    items,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    ...(snapshot.mock ? { mock: true } : {}),
    frozen,
  };
}

/** Seconds elapsed since the last successful fetch. */
export function staleSecondsOf(fetchedAtIso: string, nowMs: number): number {
  const fetchedMs = Date.parse(fetchedAtIso);
  if (Number.isNaN(fetchedMs)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((nowMs - fetchedMs) / 1000));
}

export function isStale(
  fetchedAtIso: string,
  nowMs: number,
  staleWarnSeconds: number,
): boolean {
  return staleSecondsOf(fetchedAtIso, nowMs) > staleWarnSeconds;
}
