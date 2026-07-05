import { describe, expect, it } from "vitest";
import type { MarketSnapshot } from "@/lib/providers/types";
import { applyPricing, isStale, staleSecondsOf } from "./engine";
import type { PricingRules } from "./rules";

const snapshot: MarketSnapshot = {
  items: [
    { key: "gold_18", currency: "IRR", amount: 100_000_000 },
    { key: "coin_emami", currency: "IRR", amount: 1_150_000_000 },
    { key: "ounce_global", currency: "USD", amount: 335_045 },
  ],
  fetchedAt: "2026-07-02T10:00:00.000Z",
  source: "mock",
  mock: true,
};

function rules(overrides: Partial<PricingRules> = {}): PricingRules {
  return {
    adjustmentRials: 1_000_000,
    adjustmentItems: ["gold_18"],
    freeze: false,
    staleWarnSeconds: 600,
    rounding: { default: 1, perItem: {} },
    ...overrides,
  };
}

describe("applyPricing — adjustment formula", () => {
  it("adds the fixed adjustment for buy AND sell (identical by business decision)", () => {
    const result = applyPricing(snapshot, rules());
    const gold = result.items.find((i) => i.key === "gold_18");
    expect(gold?.elyasianSellRials).toBe(101_000_000);
    expect(gold?.elyasianBuyRials).toBe(101_000_000);
    expect(gold?.marketAmount).toBe(100_000_000);
  });

  it("preserves snapshot metadata", () => {
    const result = applyPricing(snapshot, rules());
    expect(result.fetchedAt).toBe(snapshot.fetchedAt);
    expect(result.source).toBe("mock");
    expect(result.mock).toBe(true);
    expect(result.frozen).toBe(false);
  });
});

describe("applyPricing — PRICE_ADJ_ITEMS filtering", () => {
  it("leaves unlisted items as market-info only", () => {
    const result = applyPricing(snapshot, rules());
    const coin = result.items.find((i) => i.key === "coin_emami");
    expect(coin?.elyasianSellRials).toBeUndefined();
    expect(coin?.elyasianBuyRials).toBeUndefined();
    expect(coin?.marketAmount).toBe(1_150_000_000);
  });

  it("adjusts every listed IRR item", () => {
    const result = applyPricing(
      snapshot,
      rules({ adjustmentItems: ["gold_18", "coin_emami"] }),
    );
    const coin = result.items.find((i) => i.key === "coin_emami");
    expect(coin?.elyasianSellRials).toBe(1_151_000_000);
  });

  it("never adjusts USD items even if listed", () => {
    const result = applyPricing(
      snapshot,
      rules({ adjustmentItems: ["gold_18", "ounce_global"] }),
    );
    const ounce = result.items.find((i) => i.key === "ounce_global");
    expect(ounce?.elyasianSellRials).toBeUndefined();
    expect(ounce?.marketAmount).toBe(335_045);
  });
});

describe("applyPricing — freeze behavior", () => {
  it("withholds Elyasian prices but keeps market data visible", () => {
    const result = applyPricing(snapshot, rules({ freeze: true }));
    expect(result.frozen).toBe(true);
    for (const item of result.items) {
      expect(item.elyasianSellRials).toBeUndefined();
      expect(item.elyasianBuyRials).toBeUndefined();
    }
    const gold = result.items.find((i) => i.key === "gold_18");
    expect(gold?.marketAmount).toBe(100_000_000);
    expect(result.fetchedAt).toBe(snapshot.fetchedAt);
  });

  it("treats an upstream trading halt exactly like PRICE_FREEZE", () => {
    const halted: MarketSnapshot = { ...snapshot, upstreamFrozen: true };
    const result = applyPricing(halted, rules({ freeze: false }));
    expect(result.frozen).toBe(true);
    const gold = result.items.find((i) => i.key === "gold_18");
    expect(gold?.elyasianSellRials).toBeUndefined();
    expect(gold?.elyasianBuyRials).toBeUndefined();
    expect(gold?.marketAmount).toBe(100_000_000);
  });

  it("stays unfrozen when upstreamFrozen is absent or false", () => {
    expect(applyPricing(snapshot, rules()).frozen).toBe(false);
    expect(
      applyPricing({ ...snapshot, upstreamFrozen: false }, rules()).frozen,
    ).toBe(false);
  });
});

describe("applyPricing — rounding hook", () => {
  it("rounds Elyasian prices to the nearest N rials when configured", () => {
    const bumpy: MarketSnapshot = {
      ...snapshot,
      items: [{ key: "gold_18", currency: "IRR", amount: 100_004_567 }],
    };
    const result = applyPricing(
      bumpy,
      rules({ rounding: { default: 10_000, perItem: {} } }),
    );
    const gold = result.items.find((i) => i.key === "gold_18");
    expect(gold?.elyasianSellRials).toBe(101_000_000);
    // Market rate itself is never rounded.
    expect(gold?.marketAmount).toBe(100_004_567);
  });

  it("supports per-item overrides", () => {
    const result = applyPricing(
      snapshot,
      rules({
        rounding: { default: 1, perItem: { gold_18: 1_000_000 } },
        adjustmentRials: 1_400_000,
      }),
    );
    const gold = result.items.find((i) => i.key === "gold_18");
    expect(gold?.elyasianSellRials).toBe(101_000_000);
  });
});

describe("staleness detection", () => {
  const fetchedAt = "2026-07-02T10:00:00.000Z";
  const t0 = Date.parse(fetchedAt);

  it("computes seconds since the last successful fetch", () => {
    expect(staleSecondsOf(fetchedAt, t0 + 90_000)).toBe(90);
    expect(staleSecondsOf(fetchedAt, t0)).toBe(0);
  });

  it("flags stale only past the threshold", () => {
    expect(isStale(fetchedAt, t0 + 600_000, 600)).toBe(false);
    expect(isStale(fetchedAt, t0 + 601_000, 600)).toBe(true);
  });

  it("treats unparseable timestamps as stale", () => {
    expect(isStale("not-a-date", t0, 600)).toBe(true);
  });
});
