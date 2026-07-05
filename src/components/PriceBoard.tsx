"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PriceResult } from "@/lib/prices";
import { FreshnessBadge } from "./FreshnessBadge";
import { MarketTable } from "./MarketTable";
import { PriceCard } from "./PriceCard";

const POLL_MS = 45_000;
/** Faster retry while in the cold-start/degraded state (no data yet). */
const RETRY_MS = 5_000;
/** Re-evaluate staleness locally between polls. */
const TICK_MS = 15_000;

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

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/price", { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as PriceResult;
      setData(next);
      setStale(next.stale);
    } catch {
      // Network hiccup: keep showing the current data; next tick retries.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const interval = data.snapshot ? POLL_MS : RETRY_MS;
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, data.snapshot]);

  useEffect(() => {
    const id = setInterval(() => {
      const fetchedAt = data.snapshot?.fetchedAt;
      if (!fetchedAt) return;
      const ageSeconds = (Date.now() - Date.parse(fetchedAt)) / 1000;
      setStale(ageSeconds > data.staleWarnSeconds);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [data]);

  const snapshot = data.snapshot;
  const gold = snapshot?.items.find((item) => item.key === "gold_18");

  return (
    <div className="flex flex-col gap-6">
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
