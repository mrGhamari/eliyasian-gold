import { BrsApiProvider } from "./brsapi";
import { MockProvider } from "./mock";
import type { PriceProvider } from "./types";

/**
 * Provider factory — the ONLY place a concrete provider is chosen.
 * Selection is driven by the PRICE_PROVIDER env var (mock is the dev default).
 * Swapping providers touches only the provider file + env, nothing else.
 */
export function getPriceProvider(): PriceProvider {
  const which = (process.env.PRICE_PROVIDER ?? "mock").trim().toLowerCase();
  switch (which) {
    case "brsapi":
      return new BrsApiProvider();
    case "mock":
      return new MockProvider();
    default:
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "unknown_price_provider",
          value: which,
          fallback: "mock",
        }),
      );
      return new MockProvider();
  }
}
