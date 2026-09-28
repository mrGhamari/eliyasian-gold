import { z } from "zod";
import type { MarketSnapshot, PriceProvider } from "./types";

/**
 * TalaseaProvider — real upstream provider (public endpoint, no API key).
 *
 * Endpoint: https://api.talasea.ir/api/market/getGoldPrice
 *
 * Unit normalization (verified 2026-07-05 against published market rates):
 * `price` is TOMAN PER MILLIGRAM (سوت) of 18-karat gold, as a numeric string.
 * Sample `"17764"` → 17,764,000 toman/gram, matching the press-quoted
 * ~17.6M toman/gram for the same period. Therefore:
 *
 *   integer rials per gram = price × 1000 (mg→g) × 10 (toman→rial)
 *
 * Talasea provides ONLY 18k gold — no coins, no global ounce — so the
 * snapshot contains a single gold_18 item; the UI hides the market table
 * when those items are absent.
 *
 * The fetch deliberately bypasses the Next.js Data Cache (`no-store`): the
 * in-memory TTL cache in getPrices() already keeps upstream usage at
 * ~1 req / 60s, and the Data Cache would serve an old body (stale-while-
 * revalidate, and kept indefinitely when revalidation fails) that we'd then
 * stamp with a fresh `fetchedAt` — hiding outages from the staleness warning
 * and /api/health. A timeout keeps a hung upstream from hanging page renders.
 */

const ENDPOINT = "https://api.talasea.ir/api/market/getGoldPrice";

/** Toman/milligram → integer rials/gram. */
const RIALS_PER_GRAM_FACTOR = 10_000;

/** Abort a slow/hung upstream so renders and /api/price stay responsive. */
export const UPSTREAM_TIMEOUT_MS = 5_000;

// Derived strictly from the real sample response (2026-07-05). Only the
// fields we consume are validated; unknown fields pass through untouched.
// `price` is critical (fail hard); the disable flags are auxiliary, so their
// absence must not take the whole price feed down (treated as false).
const talaseaResponseSchema = z.object({
  price: z.string().regex(/^\d+$/, "price must be a numeric string"),
  disableBuy: z.boolean().optional(),
  disableSell: z.boolean().optional(),
});

/**
 * Server build: `no-store` (see above). Static export (GitHub Pages) renders
 * once at build time, where Next.js rejects `no-store` fetches outright; there
 * `force-cache` is still a fresh fetch (each CI build starts with an empty
 * Data Cache) and lets the page and price.json share one upstream request.
 */
export function fetchCacheMode(): RequestCache {
  return process.env.STATIC_EXPORT === "true" ? "force-cache" : "no-store";
}

export class TalaseaProvider implements PriceProvider {
  readonly name = "talasea";

  async fetchMarketSnapshot(): Promise<MarketSnapshot> {
    const res = await fetch(ENDPOINT, {
      cache: fetchCacheMode(),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`talasea upstream returned HTTP ${res.status}`);
    }

    const parsed = talaseaResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      throw new Error(
        `talasea response failed validation: ${parsed.error.message}`,
      );
    }

    const tomanPerMilligram = Number.parseInt(parsed.data.price, 10);
    const rialsPerGram = tomanPerMilligram * RIALS_PER_GRAM_FACTOR;

    // Either flag means Talasea has halted a side of trading, so its quote
    // is not safe to sell against — surface it as an upstream freeze.
    const upstreamFrozen =
      parsed.data.disableBuy === true || parsed.data.disableSell === true;

    return {
      items: [{ key: "gold_18", currency: "IRR", amount: rialsPerGram }],
      fetchedAt: new Date().toISOString(),
      source: "talasea",
      ...(upstreamFrozen ? { upstreamFrozen: true } : {}),
    };
  }
}
