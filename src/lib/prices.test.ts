import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketSnapshot } from "./providers/types";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("./providers", () => ({
  getPriceProvider: () => ({
    name: "test",
    fetchMarketSnapshot: fetchMock,
  }),
}));

import { resetAlertState } from "./alerts";
import { getPrices, resetPriceCache } from "./prices";

function snapshotAt(nowMs: number): MarketSnapshot {
  return {
    items: [{ key: "gold_18", currency: "IRR", amount: 100_000_000 }],
    fetchedAt: new Date(nowMs).toISOString(),
    source: "test",
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-02T10:00:00.000Z"));
  fetchMock.mockReset();
  resetPriceCache();
  resetAlertState();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("getPrices — single cached upstream fetch", () => {
  it("does not multiply upstream requests under repeated calls (polling)", async () => {
    fetchMock.mockImplementation(async () => snapshotAt(Date.now()));

    for (let i = 0; i < 25; i++) {
      await getPrices(); // simulates page renders + /api/price polling
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000); // past the 60s TTL
    await getPrices();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("getPrices — resilience", () => {
  it("serves last-known-good with its ORIGINAL timestamp when upstream fails", async () => {
    const t0 = Date.now();
    fetchMock.mockImplementationOnce(async () => snapshotAt(t0));
    const first = await getPrices();
    expect(first.snapshot?.fetchedAt).toBe(new Date(t0).toISOString());

    vi.advanceTimersByTime(61_000);
    fetchMock.mockRejectedValue(new Error("upstream down"));
    const degraded = await getPrices();

    expect(degraded.snapshot).not.toBeNull();
    expect(degraded.snapshot?.fetchedAt).toBe(new Date(t0).toISOString());
    expect(degraded.stale).toBe(false); // 61s < 600s threshold
    expect(console.error).toHaveBeenCalled();
  });

  it("flips to stale once last-known-good exceeds STALE_WARN_SECONDS", async () => {
    const t0 = Date.now();
    fetchMock.mockImplementationOnce(async () => snapshotAt(t0));
    await getPrices();

    fetchMock.mockRejectedValue(new Error("upstream down"));
    vi.advanceTimersByTime(601_000);
    const result = await getPrices();

    expect(result.stale).toBe(true);
    expect(result.staleSeconds).toBe(601);
    expect(result.snapshot?.fetchedAt).toBe(new Date(t0).toISOString());
  });

  it("cold start with upstream down returns a degraded (null) snapshot, never throws", async () => {
    fetchMock.mockRejectedValue(new Error("upstream down"));
    const result = await getPrices();
    expect(result.snapshot).toBeNull();
    expect(result.stale).toBe(true);
    expect(result.staleSeconds).toBeNull();
  });

  it("does not re-hit upstream on every call during a sustained outage", async () => {
    const t0 = Date.now();
    fetchMock.mockImplementationOnce(async () => snapshotAt(t0));
    await getPrices();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000); // past TTL -> one retry, which fails
    fetchMock.mockRejectedValue(new Error("upstream down"));
    await getPrices();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Many more polls within the next TTL must serve last-known-good without
    // hammering the down provider (the ~1 req/60s budget must hold in outages).
    for (let i = 0; i < 10; i++) await getPrices();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers on the next successful fetch after failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("upstream down"));
    await getPrices();

    const t1 = Date.now();
    fetchMock.mockImplementation(async () => snapshotAt(Date.now()));
    const recovered = await getPrices();
    expect(recovered.snapshot?.fetchedAt).toBe(new Date(t1).toISOString());
    expect(recovered.stale).toBe(false);
  });
});
