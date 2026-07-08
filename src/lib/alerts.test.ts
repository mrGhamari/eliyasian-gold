import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maybeSendStalenessAlert, resetAlertState } from "./alerts";

const THROTTLE_MS = 30 * 60 * 1000;
const BASE = 1_700_000_000_000; // a real epoch so the first send isn't throttled

beforeEach(() => {
  resetAlertState();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "t");
  vi.stubEnv("TELEGRAM_CHAT_ID", "c");
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("maybeSendStalenessAlert", () => {
  it("alerts a second stale episode even when a mid-throttle transition is dropped", () => {
    maybeSendStalenessAlert(true, 601, BASE); // episode 1 -> alert
    expect(fetch).toHaveBeenCalledTimes(1);

    maybeSendStalenessAlert(false, 0, BASE + 1000); // recover

    // Episode 2 starts inside the throttle window: no send yet, but the
    // transition must NOT be swallowed.
    maybeSendStalenessAlert(true, 601, BASE + THROTTLE_MS / 3);
    expect(fetch).toHaveBeenCalledTimes(1);

    // Once the throttle clears and it's still stale, the second episode fires.
    maybeSendStalenessAlert(true, 601, BASE + THROTTLE_MS + 1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not re-alert while a single episode stays stale", () => {
    maybeSendStalenessAlert(true, 601, BASE);
    maybeSendStalenessAlert(true, 999, BASE + THROTTLE_MS + 1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
