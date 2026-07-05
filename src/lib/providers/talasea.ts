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
 * The fetch uses the Next.js Data Cache (revalidate: 60) in addition to the
 * in-memory TTL cache in getPrices(), keeping upstream usage ~1 req / 60s.
 */

const ENDPOINT = "https://api.talasea.ir/api/market/getGoldPrice";

/** Toman/milligram → integer rials/gram. */
const RIALS_PER_GRAM_FACTOR = 10_000;

// Derived strictly from the real sample response (2026-07-05). Only the
// field we consume is validated; unknown fields pass through untouched.
const talaseaResponseSchema = z.object({
  price: z.string().regex(/^\d+$/, "price must be a numeric string"),
});

export class TalaseaProvider implements PriceProvider {
  readonly name = "talasea";

  async fetchMarketSnapshot(): Promise<MarketSnapshot> {
    const res = await fetch(ENDPOINT, {
      next: { revalidate: 60, tags: ["prices"] },
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

    return {
      items: [{ key: "gold_18", currency: "IRR", amount: rialsPerGram }],
      fetchedAt: new Date().toISOString(),
      source: "talasea",
    };
  }
}
