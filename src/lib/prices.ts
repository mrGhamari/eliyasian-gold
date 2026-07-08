import { maybeSendStalenessAlert } from "./alerts";
import { applyPricing, staleSecondsOf } from "./pricing/engine";
import type { DisplaySnapshot } from "./pricing/engine";
import { getRules } from "./pricing/rules";
import { getPriceProvider } from "./providers";
import type { MarketSnapshot } from "./providers/types";

/**
 * getPrices() — the single data-flow function. Both page.tsx and the API
 * routes call this; nothing else touches the provider.
 *
 * Caching strategy (why upstream stays at ~1 request / 60s):
 * 1. A module-level in-memory TTL cache (60s) in front of the provider. Route
 *    handlers are dynamic per-request in the App Router, so this layer is
 *    what guarantees that client polling of /api/price cannot multiply
 *    upstream calls — provider-agnostic and verified by unit test.
 * 2. The real provider's inner fetch() additionally uses the Next.js Data
 *    Cache (`next: { revalidate: 60, tags: ["prices"] }`).
 * 3. The page itself is ISR (`revalidate = 60`), so HTML is served from cache.
 *
 * Last-known-good: the last successful snapshot is kept in module memory and
 * served (with its ORIGINAL fetchedAt) whenever upstream fails. This is
 * acceptable because the deployment target is a single long-running Node
 * instance (Liara) — see README.
 */

const TTL_MS = 60_000;

interface CacheState {
  snapshot: MarketSnapshot | null;
  cachedAtMs: number;
  lastKnownGood: MarketSnapshot | null;
}

// Survives module re-evaluation across App Router server chunks by hanging
// off globalThis — page.tsx and route handlers must share one cache.
const globalStore = globalThis as typeof globalThis & {
  __elyasianPriceCache?: CacheState;
};

function cacheState(): CacheState {
  globalStore.__elyasianPriceCache ??= {
    snapshot: null,
    cachedAtMs: 0,
    lastKnownGood: null,
  };
  return globalStore.__elyasianPriceCache;
}

/** Test-only reset. */
export function resetPriceCache(): void {
  globalStore.__elyasianPriceCache = {
    snapshot: null,
    cachedAtMs: 0,
    lastKnownGood: null,
  };
}

async function getMarketSnapshot(): Promise<MarketSnapshot | null> {
  const state = cacheState();
  const nowMs = Date.now();

  if (state.snapshot && nowMs - state.cachedAtMs < TTL_MS) {
    return state.snapshot;
  }

  const provider = getPriceProvider();
  try {
    const snapshot = await provider.fetchMarketSnapshot();
    state.snapshot = snapshot;
    state.cachedAtMs = nowMs;
    state.lastKnownGood = snapshot;
    return snapshot;
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "upstream_fetch_failed",
        provider: provider.name,
        error: String(error),
      }),
    );
    // Serve last-known-good and cache it for the TTL so a sustained outage
    // can't multiply upstream calls (the whole point of the ~1 req/60s budget
    // is to hold during an outage, not just when healthy). Cold start with no
    // good snapshot yet leaves snapshot null, so the next call still retries.
    state.snapshot = state.lastKnownGood;
    state.cachedAtMs = nowMs;
    return state.lastKnownGood;
  }
}

export interface PriceResult {
  /** null only on cold start with upstream down (degraded state). */
  snapshot: DisplaySnapshot | null;
  provider: string;
  /** Seconds since the last successful fetch; null when no data yet. */
  staleSeconds: number | null;
  stale: boolean;
  staleWarnSeconds: number;
}

export async function getPrices(): Promise<PriceResult> {
  const rules = getRules();
  // Authoritative name from the same factory that selects the provider — a
  // second env read here drifts on casing/fallback from providers/index.ts.
  const providerName = getPriceProvider().name;
  const market = await getMarketSnapshot();
  const nowMs = Date.now();

  if (!market) {
    return {
      snapshot: null,
      provider: providerName,
      staleSeconds: null,
      stale: true,
      staleWarnSeconds: rules.staleWarnSeconds,
    };
  }

  const staleSeconds = staleSecondsOf(market.fetchedAt, nowMs);
  const stale = staleSeconds > rules.staleWarnSeconds;
  maybeSendStalenessAlert(stale, staleSeconds, nowMs);

  return {
    snapshot: applyPricing(market, rules),
    provider: providerName,
    staleSeconds,
    stale,
    staleWarnSeconds: rules.staleWarnSeconds,
  };
}
