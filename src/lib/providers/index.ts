import { MockProvider } from "./mock";
import { TalaseaProvider } from "./talasea";
import type { MarketSnapshot, PriceProvider } from "./types";

/**
 * Provider factory — the ONLY place a concrete provider is chosen.
 * Selection is driven by the PRICE_PROVIDER env var. Swapping providers
 * touches only the provider file + env, nothing else.
 *
 * Production is fail-closed: an unset PRICE_PROVIDER defaults to the real
 * provider (talasea), and an unknown value NEVER silently falls back to mock
 * data — fake prices shown to customers are worse than no prices. Instead a
 * provider that always fails is returned, so the site shows its "no data"
 * state and /api/health reports 503. Even PRICE_PROVIDER=mock is refused in
 * production unless ALLOW_MOCK_IN_PRODUCTION=true (for a staging deploy), and
 * the UI always labels mock data as test data.
 */

/** Fails every fetch so a misconfiguration surfaces as degraded + health 503. */
class MisconfiguredProvider implements PriceProvider {
  readonly name = "misconfigured";

  constructor(private readonly value: string) {}

  async fetchMarketSnapshot(): Promise<MarketSnapshot> {
    throw new Error(`unknown PRICE_PROVIDER "${this.value}"`);
  }
}

let warnedValue: string | null = null;

/** Log an unknown provider once per value, not on every request. */
function warnUnknown(value: string, fallback: string): void {
  if (warnedValue === value) return;
  warnedValue = value;
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "unknown_price_provider",
      value,
      fallback,
    }),
  );
}

export function getPriceProvider(): PriceProvider {
  const isProduction = process.env.NODE_ENV === "production";
  const raw = (process.env.PRICE_PROVIDER ?? "").trim().toLowerCase();
  const which = raw || (isProduction ? "talasea" : "mock");

  switch (which) {
    case "talasea":
      return new TalaseaProvider();
    case "mock":
      if (
        isProduction &&
        (process.env.ALLOW_MOCK_IN_PRODUCTION ?? "").trim().toLowerCase() !== "true"
      ) {
        warnUnknown("mock (not allowed in production)", "none");
        return new MisconfiguredProvider("mock");
      }
      return new MockProvider();
    default:
      if (isProduction) {
        warnUnknown(which, "none");
        return new MisconfiguredProvider(which);
      }
      warnUnknown(which, "mock");
      return new MockProvider();
  }
}
