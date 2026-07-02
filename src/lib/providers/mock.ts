import type { MarketItem, MarketSnapshot, PriceProvider } from "./types";

/**
 * MockProvider — dev/test default.
 *
 * Produces plausible magnitudes (mid-2026 Iranian market) with a small
 * deterministic time-based wobble so the client polling visibly updates.
 * All IRR values are integer rials; ounce_global is integer US cents.
 */

/** Base values: integer rials (IRR) / integer US cents (USD). */
const BASE: MarketItem[] = [
  { key: "gold_18", currency: "IRR", amount: 105_000_000 },
  { key: "coin_emami", currency: "IRR", amount: 1_150_000_000 },
  { key: "coin_half", currency: "IRR", amount: 620_000_000 },
  { key: "coin_quarter", currency: "IRR", amount: 360_000_000 },
  { key: "ounce_global", currency: "USD", amount: 335_045 },
];

/**
 * Counts real "upstream" fetches. Exposed so tests (and the acceptance
 * checklist) can prove that page traffic + client polling do not multiply
 * upstream requests.
 */
export let mockFetchCount = 0;

export function resetMockFetchCount(): void {
  mockFetchCount = 0;
}

/** Deterministic integer wobble of about ±0.2% so polled values change. */
function wobble(amount: number, nowMs: number, salt: number): number {
  const phase = Math.sin(nowMs / 60_000 + salt);
  const delta = Math.round((amount * phase) / 500);
  return amount + delta;
}

export class MockProvider implements PriceProvider {
  readonly name = "mock";

  async fetchMarketSnapshot(): Promise<MarketSnapshot> {
    mockFetchCount += 1;
    const nowMs = Date.now();
    return {
      items: BASE.map((item, i) => ({
        ...item,
        amount: wobble(item.amount, nowMs, i),
      })),
      fetchedAt: new Date(nowMs).toISOString(),
      source: "mock",
      mock: true,
    };
  }
}
