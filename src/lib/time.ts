/** Time helpers — all user-facing timestamps are Tehran time, fa-IR digits. */

const tehranTime = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit",
});

/** «۱۴:۰۳» for a given ISO timestamp, in Asia/Tehran. */
export function formatTehranTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return tehranTime.format(new Date(ms));
}
