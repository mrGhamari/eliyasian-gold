import { isItemKey, type ItemKey } from "@/lib/providers/types";

/**
 * Pricing rules — env-backed today, deliberately funneled through this single
 * getRules() function so a DB-backed implementation can replace it later
 * without touching any caller.
 */

export interface PricingRules {
  /** Adjustment added to the market rate for the SELL price, integer rials. */
  sellAdjustmentRials: number;
  /** Adjustment added to the market rate for the BUY price, integer rials. */
  buyAdjustmentRials: number;
  /** Internal item keys the adjustment applies to. */
  adjustmentItems: ItemKey[];
  /** true => withhold Elyasian buy/sell numbers and show the freeze banner. */
  freeze: boolean;
  /** Staleness threshold (seconds) for the UI warning and /api/health 503. */
  staleWarnSeconds: number;
  /**
   * Rounding hook: round Elyasian prices to the nearest N rials, per item.
   * Items not present fall back to `default`. N=1 means rounding is off.
   */
  rounding: { default: number; perItem: Partial<Record<ItemKey, number>> };
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed)) {
    console.warn(
      JSON.stringify({ level: "warn", event: "invalid_int_env", name, raw }),
    );
    return fallback;
  }
  return parsed;
}

export function getRules(): PricingRules {
  const rawItems = process.env.PRICE_ADJ_ITEMS ?? "gold_18";
  const adjustmentItems = rawItems
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s): s is ItemKey => {
      if (isItemKey(s)) return true;
      console.warn(
        JSON.stringify({ level: "warn", event: "unknown_adj_item", key: s }),
      );
      return false;
    });

  return {
    // Sell price is market + 50,000 toman; buy price is market − 50,000 toman.
    // (50,000 toman = 500,000 rials.)
    sellAdjustmentRials: intEnv("PRICE_ADJ_SELL_RIALS", 500_000),
    buyAdjustmentRials: intEnv("PRICE_ADJ_BUY_RIALS", -500_000),
    adjustmentItems,
    freeze: (process.env.PRICE_FREEZE ?? "false").trim().toLowerCase() === "true",
    staleWarnSeconds: intEnv("STALE_WARN_SECONDS", 600),
    // Rounding is off (N=1) by default; per-item overrides can be added here
    // (or by the future DB-backed rules source) without touching callers.
    rounding: { default: 1, perItem: {} },
  };
}
