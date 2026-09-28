"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PriceResult } from "@/lib/prices";
import { FreshnessBadge } from "./FreshnessBadge";
import { MarketTable } from "./MarketTable";
import { MockDataBanner } from "./MockDataBanner";
import { PriceCard } from "./PriceCard";

const POLL_MS = 45_000;
/** Faster retry while in the cold-start/degraded state (no data yet). */
const RETRY_MS = 5_000;
/** Re-evaluate staleness locally between polls. */
const TICK_MS = 15_000;

/** Server build: the API route. Static (GitHub Pages) build: a JSON file. */
const PRICE_ENDPOINT = process.env.NEXT_PUBLIC_PRICE_ENDPOINT || "/api/price";

/**
 * Static hosting: the JSON's staleSeconds was frozen at build time, so the
 * age must come from fetchedAt and the client clock (there is no server to
 * measure it). This accepts clock skew, which the server build avoids.
 */
const STATIC_PRICES = process.env.NEXT_PUBLIC_STATIC_PRICES === "true";

/** Seconds since the last successful fetch, as of now. */
function ageSeconds(result: PriceResult): number | null {
  if (!STATIC_PRICES) return result.staleSeconds;
  if (!result.snapshot) return null;
  const fetchedMs = Date.parse(result.snapshot.fetchedAt);
  if (Number.isNaN(fetchedMs)) return null;
  return Math.max(0, (Date.now() - fetchedMs) / 1000);
}

function isStaleNow(result: PriceResult): boolean {
  if (!STATIC_PRICES) return result.stale;
  const age = ageSeconds(result);
  return age === null || age > result.staleWarnSeconds;
}

/**
 * Client shell: renders the server snapshot immediately (no layout shift),
 * then polls /api/price to keep numbers live.
 */
export function PriceBoard({ initialData }: { initialData: PriceResult }) {
  const [data, setData] = useState<PriceResult>(initialData);
  // Staleness can flip between polls; recompute on a local tick. Initialized
  // from the server value so SSR markup and hydration match.
  const [stale, setStale] = useState(initialData.stale);
  const inFlight = useRef(false);
  // Anchor for local staleness aging. Uses ONLY elapsed time on the client's
  // own clock (never the absolute server timestamp), so a skewed client clock
  // can't produce a false "outdated" warning. Ages the server's staleSeconds
  // forward between polls — needed because a network outage stops polls from
  // landing, yet the badge must still flip to stale on its own.
  const anchor = useRef({ atMs: 0, staleSeconds: initialData.staleSeconds });

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(PRICE_ENDPOINT, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as PriceResult;
      setData(next);
      setStale(isStaleNow(next));
      anchor.current = { atMs: Date.now(), staleSeconds: ageSeconds(next) };
    } catch {
      // Network hiccup: keep showing the current data; next tick retries.
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Anchor the server snapshot to the client clock on mount (Date.now() must
  // not run during render/SSR — it would mismatch hydration).
  useEffect(() => {
    anchor.current = { atMs: Date.now(), staleSeconds: ageSeconds(initialData) };
    // Static build: the HTML may be minutes old by the time it's opened.
    if (STATIC_PRICES) setStale(isStaleNow(initialData));
  }, [initialData]);

  // Poll only while the tab is visible; refresh immediately on return so a
  // backgrounded tab never shows old numbers.
  const hasSnapshot = data.snapshot !== null;
  useEffect(() => {
    const interval = hasSnapshot ? POLL_MS : RETRY_MS;
    let id: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (id === undefined) id = setInterval(refresh, interval);
    };
    const stop = () => {
      clearInterval(id);
      id = undefined;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh, hasSnapshot]);

  useEffect(() => {
    const id = setInterval(() => {
      const { atMs, staleSeconds } = anchor.current;
      if (atMs === 0 || staleSeconds === null) return;
      // Threshold mirrors the server rule (staleSeconds > staleWarnSeconds);
      // staleWarnSeconds itself comes from the server, so only the operator is
      // local — not worth a shared helper.
      const age = staleSeconds + (Date.now() - atMs) / 1000;
      setStale(age > data.staleWarnSeconds);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [data.staleWarnSeconds]);

  const snapshot = data.snapshot;
  const gold = snapshot?.items.find((item) => item.key === "gold_18");

  return (
    <div className="flex flex-col gap-6">
      {snapshot?.mock && <MockDataBanner />}
      <PriceCard
        item={gold}
        frozen={snapshot?.frozen ?? false}
        badge={
          snapshot ? (
            <FreshnessBadge fetchedAt={snapshot.fetchedAt} stale={stale} />
          ) : null
        }
      />
      <MarketTable items={snapshot?.items ?? []} loading={!snapshot} />
    </div>
  );
}
