import { afterEach, describe, expect, it, vi } from "vitest";
import { getRules } from "./rules";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getRules (env-backed)", () => {
  it("provides spec defaults when envs are unset", () => {
    vi.stubEnv("PRICE_ADJ_SELL_RIALS", "");
    vi.stubEnv("PRICE_ADJ_BUY_RIALS", "");
    vi.stubEnv("PRICE_ADJ_ITEMS", "");
    vi.stubEnv("PRICE_FREEZE", "");
    vi.stubEnv("STALE_WARN_SECONDS", "");
    const rules = getRules();
    expect(rules.sellAdjustmentRials).toBe(500_000);
    expect(rules.buyAdjustmentRials).toBe(-500_000);
    expect(rules.freeze).toBe(false);
    expect(rules.staleWarnSeconds).toBe(600);
    expect(rules.rounding.default).toBe(1);
  });

  it("parses PRICE_ADJ_ITEMS as a comma-separated list", () => {
    vi.stubEnv("PRICE_ADJ_ITEMS", "gold_18, coin_emami");
    expect(getRules().adjustmentItems).toEqual(["gold_18", "coin_emami"]);
  });

  it("drops unknown item keys with a warning instead of crashing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("PRICE_ADJ_ITEMS", "gold_18,bogus_key");
    expect(getRules().adjustmentItems).toEqual(["gold_18"]);
    expect(warn).toHaveBeenCalled();
  });

  it("reads the buy/sell adjustments and PRICE_FREEZE", () => {
    vi.stubEnv("PRICE_ADJ_SELL_RIALS", "600000");
    vi.stubEnv("PRICE_ADJ_BUY_RIALS", "-600000");
    vi.stubEnv("PRICE_FREEZE", "true");
    const rules = getRules();
    expect(rules.sellAdjustmentRials).toBe(600_000);
    expect(rules.buyAdjustmentRials).toBe(-600_000);
    expect(rules.freeze).toBe(true);
  });

  it("falls back on malformed integers with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("PRICE_ADJ_SELL_RIALS", "one million");
    expect(getRules().sellAdjustmentRials).toBe(500_000);
    expect(warn).toHaveBeenCalled();
  });
});
