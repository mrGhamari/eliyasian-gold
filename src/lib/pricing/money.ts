/**
 * Money utilities. Internal representation is ALWAYS integer rials (IRR) or
 * integer US cents (USD). Conversions and formatting live here; nothing else
 * in the codebase does price math on floats.
 */

const faDecimal = new Intl.NumberFormat("fa-IR", { useGrouping: true });

function assertIntegerAmount(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${what} must be a safe integer, got: ${value}`);
  }
}

/**
 * Round to the nearest multiple of N rials (the "rounding hook").
 * N=1 (the default) is a no-op. Integer-only math.
 */
export function roundToNearestRials(rials: number, nearest: number): number {
  assertIntegerAmount(rials, "rials");
  assertIntegerAmount(nearest, "nearest");
  if (nearest <= 1) return rials;
  const half = Math.trunc(nearest / 2);
  return Math.trunc((rials + half) / nearest) * nearest;
}

/** 1 toman = 10 rials. Rounds to the nearest toman (integer in, integer out). */
export function rialsToToman(rials: number): number {
  assertIntegerAmount(rials, "rials");
  return Math.trunc((rials + 5) / 10);
}

/** fa-IR digits + thousands separators, no unit: 101000000 rials -> «۱۰,۱۰۰,۰۰۰». */
export function formatRialsAsToman(rials: number): string {
  return faDecimal.format(rialsToToman(rials));
}

/** Same as formatRialsAsToman but with the «تومان» unit label appended. */
export function formatRialsAsTomanWithUnit(rials: number): string {
  return `${formatRialsAsToman(rials)} تومان`;
}

/** USD stored as integer cents: 335045 -> «۳,۳۵۰٫۴۵ دلار». */
export function formatUsdCents(cents: number): string {
  assertIntegerAmount(cents, "cents");
  const formatted = new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100); // display-only division; never fed back into price math
  return `${formatted} دلار`;
}

/** fa-IR digits for arbitrary integers (counts, minutes, ...). */
export function formatFaInteger(value: number): string {
  return faDecimal.format(value);
}
