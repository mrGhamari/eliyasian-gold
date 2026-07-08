/**
 * Optional, env-gated Telegram staleness alert.
 *
 * Fires once on the transition from fresh -> stale, throttled to at most one
 * message per 30 minutes. Piggybacks on getPrices() calls — no timers.
 * If TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are absent the feature is silently
 * off. Note: api.telegram.org may be unreachable from Iranian datacenters;
 * an external monitor on /api/health is the reliable alerting path.
 */

const THROTTLE_MS = 30 * 60 * 1000;

let wasStale = false;
let lastSentAtMs = 0;

/** Test-only reset. */
export function resetAlertState(): void {
  wasStale = false;
  lastSentAtMs = 0;
}

export function maybeSendStalenessAlert(
  stale: boolean,
  staleSeconds: number,
  nowMs: number,
): void {
  // Recovery resets the edge; only latch `wasStale` once we've actually sent,
  // so a transition throttled now still fires on a later tick instead of being
  // silently consumed (a second stale episode must not be swallowed).
  if (!stale) {
    wasStale = false;
    return;
  }
  if (wasStale) return; // already handled this stale episode

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  if (nowMs - lastSentAtMs < THROTTLE_MS) return;
  wasStale = true;
  lastSentAtMs = nowMs;

  const text = `⚠️ قیمت طلا الیاسیان: داده‌های قیمت ${staleSeconds} ثانیه است که به‌روز نشده‌اند.`;

  // Fire-and-forget; alerting must never affect request handling.
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  }).catch((error: unknown) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "telegram_alert_failed",
        error: String(error),
      }),
    );
  });
}
