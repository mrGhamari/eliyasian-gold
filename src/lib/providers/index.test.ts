import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPriceProvider } from "./index";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getPriceProvider", () => {
  it("defaults to mock outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PRICE_PROVIDER", "");
    expect(getPriceProvider().name).toBe("mock");
  });

  it("defaults to the real provider in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRICE_PROVIDER", "");
    expect(getPriceProvider().name).toBe("talasea");
  });

  it("never falls back to mock data in production on an unknown value", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRICE_PROVIDER", "talase");
    const provider = getPriceProvider();
    expect(provider.name).toBe("misconfigured");
    await expect(provider.fetchMarketSnapshot()).rejects.toThrow("talase");
  });

  it("falls back to mock on an unknown value outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PRICE_PROVIDER", "bogus");
    expect(getPriceProvider().name).toBe("mock");
  });

  it("refuses mock in production unless explicitly allowed", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRICE_PROVIDER", " Mock ");
    vi.stubEnv("ALLOW_MOCK_IN_PRODUCTION", "");
    expect(getPriceProvider().name).toBe("misconfigured");

    vi.stubEnv("ALLOW_MOCK_IN_PRODUCTION", "true");
    expect(getPriceProvider().name).toBe("mock");
  });
});
