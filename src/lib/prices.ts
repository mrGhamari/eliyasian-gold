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
 * A module-level in-memory TTL cache (60s) sits in front of the provider.
 * The page and route handlers are dynamic per-request, so this layer alone
 * guarantees that traffic and client polling cannot multiply upstream calls:
 * - at most one upstream attempt per TTL, successful or not;
 * - concurrent callers on an expired cache share one in-flight request.
 * Both are provider-agnostic and verified by unit test.
 *
 * Last-known-good: the last successful snapshot is kept in module memory and
 * served (with its ORIGINAL fetchedAt) whenever upstream fails. This is
 * acceptable because the deployment target is a single long-running Node
 * instance (Liara) — see README.
 */

const TTL_MS = 60_000;

/**
 * Plausibility guard: a quote that moved more than MAX_JUMP_PERCENT from a
 * recent last-known-good is treated as an upstream glitch (served as a
 * failure: last-known-good stays up, the error is logged). Only applied while
 * last-known-good is younger than JUMP_WINDOW_MS, so a real move during a
 * long outage is accepted once upstream recovers instead of being blocked
 * forever.
 */
const MAX_JUMP_PERCENT = 20;
const JUMP_WINDOW_MS = 60 * 60_000;

function implausibleJump(
  next: MarketSnapshot,
  prev: MarketSnapshot | null,
  nowMs: number,
): string | null {
  if (!prev || nowMs - Date.parse(prev.fetchedAt) > JUMP_WINDOW_MS) return null;
  for (const item of next.items) {
    const before = prev.items.find((p) => p.key === item.key);
    if (!before || before.amount <= 0) continue;
    // Integer-only comparison: |Δ| / before > MAX_JUMP_PERCENT / 100.
    if (Math.abs(item.amount - before.amount) * 100 > before.amount * MAX_JUMP_PERCENT) {
      return `implausible ${item.key} jump: ${before.amount} -> ${item.amount}`;
    }
  }
  return null;
}

interface CacheState {
  /** What callers get until the next attempt: fresh data or last-known-good. */
  snapshot: MarketSnapshot | null;
  /** When upstream was last attempted (success OR failure). */
  attemptedAtMs: number;
  lastKnownGood: MarketSnapshot | null;
  /** Single-flight: concurrent callers share one in-progress upstream call. */
  inflight: Promise<MarketSnapshot | null> | null;
}

function emptyState(): CacheState {
  return {
    snapshot: null,
    attemptedAtMs: Number.NEGATIVE_INFINITY,
    lastKnownGood: null,
    inflight: null,
  };
}

// Survives module re-evaluation across App Router server chunks by hanging
// off globalThis — page.tsx and route handlers must share one cache.
const globalStore = globalThis as typeof globalThis & {
  __elyasianPriceCache?: CacheState;
};

function cacheState(): CacheState {
  globalStore.__elyasianPriceCache ??= emptyState();
  return globalStore.__elyasianPriceCache;
}

/** Test-only reset. */
export function resetPriceCache(): void {
  globalStore.__elyasianPriceCache = emptyState();
}

async function fetchUpstream(state: CacheState): Promise<MarketSnapshot | null> {
  const provider = getPriceProvider();
  try {
    const snapshot = await provider.fetchMarketSnapshot();
    const jump = implausibleJump(snapshot, state.lastKnownGood, Date.now());
    if (jump) throw new Error(jump);
    state.snapshot = snapshot;
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
    // Serve last-known-good (null on cold start) until the next attempt.
    state.snapshot = state.lastKnownGood;
    return state.lastKnownGood;
  }
}

async function getMarketSnapshot(): Promise<MarketSnapshot | null> {
  const state = cacheState();
  if (state.inflight) return state.inflight;

  const nowMs = Date.now();
  // Failures are cached for the TTL too (cold start included): the ~1 req/60s
  // upstream budget must hold during an outage regardless of traffic.
  if (nowMs - state.attemptedAtMs < TTL_MS) {
    return state.snapshot;
  }

  state.attemptedAtMs = nowMs;
  state.inflight = fetchUpstream(state).finally(() => {
    state.inflight = null;
  });
  return state.inflight;
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
