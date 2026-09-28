import { afterEach, describe, expect, it, vi } from "vitest";
import { TalaseaProvider } from "./talasea";

/** The real sample response supplied with the endpoint (2026-07-05). */
const SAMPLE = {
  price: "17764",
  minOrderValue: 100000,
  minSellOrderValue: 100000,
  feeTable: [{ min: 0, fee: 0.01 }],
  totalOrder30dayValues: 0,
  minDeposit: 5000,
  maxDeposit: 400000000,
  maxOrderValue: 1000000000,
  fee: 0.01,
  percentageCreditLoan: 40,
  goldInstallmentPercent: 0.055,
  change24h: "0.58",
  disableBuyMessage: "",
  disableSellMessage: "",
  disableSell: false,
  disableBuy: false,
  disableMargin: false,
  disableMarginMessage: "",
  disableLimit: false,
  disableLimitMessage: "",
};

function mockFetchJson(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TalaseaProvider", () => {
  it("normalizes toman/milligram to integer rials/gram (×10,000)", async () => {
    mockFetchJson(SAMPLE);
    const snapshot = await new TalaseaProvider().fetchMarketSnapshot();

    expect(snapshot.items).toEqual([
      { key: "gold_18", currency: "IRR", amount: 177_640_000 },
    ]);
    expect(Number.isInteger(snapshot.items[0].amount)).toBe(true);
    expect(snapshot.source).toBe("talasea");
    expect(snapshot.mock).toBeUndefined();
    expect(Number.isNaN(Date.parse(snapshot.fetchedAt))).toBe(false);
  });

  it("bypasses the Data Cache and bounds the upstream call with a timeout", async () => {
    mockFetchJson(SAMPLE);
    await new TalaseaProvider().fetchMarketSnapshot();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.talasea.ir/api/market/getGoldPrice",
      { cache: "no-store", signal: expect.any(AbortSignal) },
    );
  });

  it("maps the disable flags to upstreamFrozen (either side halts)", async () => {
    mockFetchJson(SAMPLE);
    let snapshot = await new TalaseaProvider().fetchMarketSnapshot();
    expect(snapshot.upstreamFrozen).toBeUndefined();

    mockFetchJson({ ...SAMPLE, disableBuy: true });
    snapshot = await new TalaseaProvider().fetchMarketSnapshot();
    expect(snapshot.upstreamFrozen).toBe(true);

    mockFetchJson({ ...SAMPLE, disableSell: true });
    snapshot = await new TalaseaProvider().fetchMarketSnapshot();
    expect(snapshot.upstreamFrozen).toBe(true);
  });

  it("tolerates missing disable flags (price still served, not frozen)", async () => {
    mockFetchJson({ price: "17764" });
    const snapshot = await new TalaseaProvider().fetchMarketSnapshot();
    expect(snapshot.items[0].amount).toBe(177_640_000);
    expect(snapshot.upstreamFrozen).toBeUndefined();
  });

  it("throws on non-OK upstream status", async () => {
    mockFetchJson({}, 502);
    await expect(new TalaseaProvider().fetchMarketSnapshot()).rejects.toThrow(
      "HTTP 502",
    );
  });

  it("throws when price is missing or not a numeric string", async () => {
    mockFetchJson({ ...SAMPLE, price: "17,764" });
    await expect(new TalaseaProvider().fetchMarketSnapshot()).rejects.toThrow(
      "failed validation",
    );

    const withoutPrice: Record<string, unknown> = { ...SAMPLE };
    delete withoutPrice.price;
    mockFetchJson(withoutPrice);
    await expect(new TalaseaProvider().fetchMarketSnapshot()).rejects.toThrow(
      "failed validation",
    );
  });
});
