import { z } from "zod";
import type { MarketSnapshot, PriceProvider } from "./types";

/**
 * BrsApiProvider — real upstream provider (STUB, awaiting Section 4 of the spec).
 *
 * ⚠️ NOT YET WIRED: the spec's Section 4 (exact issued endpoint URL + one real
 * sample JSON response) was not provided, and the spec forbids guessing
 * upstream field names. Until the sample is supplied, this provider throws a
 * descriptive error; `getPrices()` degrades gracefully (last-known-good /
 * loading state), so selecting it never crashes the site.
 *
 * TO COMPLETE (once the real sample response is available):
 * 1. Set ENDPOINT below to the issued URL, reading the key from BRSAPI_KEY
 *    (server-side only — never expose it via NEXT_PUBLIC_).
 * 2. Replace `brsApiResponseSchema` with a zod schema derived STRICTLY from
 *    the pasted sample.
 * 3. Map upstream entries to internal keys: gold_18, coin_emami, coin_half,
 *    coin_quarter, ounce_global (USD, stored as integer cents).
 * 4. Determine from the sample whether upstream IRR values are rial or toman
 *    and normalize to INTEGER RIALS here, at the provider boundary. Document
 *    the assumption in a comment and in the README.
 * 5. Missing/unknown items: skip them with console.warn — never throw.
 *
 * The upstream fetch MUST use the Next.js Data Cache so upstream usage stays
 * at ~1 request / 60s regardless of traffic (free quota: 1500 req/day):
 *
 *   const res = await fetch(url, { next: { revalidate: 60, tags: ["prices"] } });
 */

// Placeholder schema — replace with the real shape from the Section 4 sample.
const brsApiResponseSchema = z.unknown();
void brsApiResponseSchema;

export class BrsApiProvider implements PriceProvider {
  readonly name = "brsapi";

  async fetchMarketSnapshot(): Promise<MarketSnapshot> {
    throw new Error(
      "BrsApiProvider is not configured yet: the spec's Section 4 (endpoint URL + sample JSON) " +
        "was never filled in, and field names must not be guessed. " +
        "Provide the sample and complete src/lib/providers/brsapi.ts, " +
        "or set PRICE_PROVIDER=mock.",
    );
  }
}
