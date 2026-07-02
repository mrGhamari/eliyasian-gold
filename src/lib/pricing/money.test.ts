import { describe, expect, it } from "vitest";
import {
  formatRialsAsToman,
  formatRialsAsTomanWithUnit,
  formatUsdCents,
  rialsToToman,
  roundToNearestRials,
} from "./money";

describe("rialsToToman", () => {
  it("divides by 10 (1 toman = 10 rials)", () => {
    expect(rialsToToman(101_000_000)).toBe(10_100_000);
    expect(rialsToToman(0)).toBe(0);
    expect(rialsToToman(10)).toBe(1);
  });

  it("rounds to the nearest toman", () => {
    expect(rialsToToman(14)).toBe(1);
    expect(rialsToToman(15)).toBe(2);
  });

  it("rejects non-integer input (no float price math)", () => {
    expect(() => rialsToToman(10.5)).toThrow();
    expect(() => rialsToToman(Number.NaN)).toThrow();
  });
});

describe("fa-IR formatting", () => {
  // Spot-check from the acceptance checklist: market 100,000,000 rials +
  // adjustment 1,000,000 rials = 101,000,000 rials -> «۱۰٬۱۰۰٬۰۰۰ تومان».
  it("formats rials as toman with fa-IR digits and separators", () => {
    expect(formatRialsAsToman(101_000_000)).toBe("۱۰٬۱۰۰٬۰۰۰");
  });

  it("appends the toman unit label", () => {
    expect(formatRialsAsTomanWithUnit(101_000_000)).toBe("۱۰٬۱۰۰٬۰۰۰ تومان");
  });

  it("formats USD cents with two decimals and the dollar label", () => {
    const formatted = formatUsdCents(335_045);
    expect(formatted).toContain("دلار");
    expect(formatted).toContain("۳٬۳۵۰");
  });
});

describe("roundToNearestRials (rounding hook)", () => {
  it("is a no-op with N=1 (the default)", () => {
    expect(roundToNearestRials(1_234_567, 1)).toBe(1_234_567);
  });

  it("rounds to the nearest N rials", () => {
    expect(roundToNearestRials(1_234_567, 10_000)).toBe(1_230_000);
    expect(roundToNearestRials(1_236_000, 10_000)).toBe(1_240_000);
    expect(roundToNearestRials(1_235_000, 10_000)).toBe(1_240_000);
  });

  it("stays integer-only", () => {
    expect(() => roundToNearestRials(1.5, 10)).toThrow();
    expect(() => roundToNearestRials(100, 2.5)).toThrow();
  });
});
