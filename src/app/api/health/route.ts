import { NextResponse } from "next/server";
import { getPrices } from "@/lib/prices";

/**
 * Primary alerting surface: HTTP 200 when healthy, 503 when the last
 * successful fetch is older than STALE_WARN_SECONDS (or there is no data at
 * all). Point any external uptime monitor here.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const { snapshot, provider, staleSeconds, stale } = await getPrices();
  const ok = !stale && snapshot !== null;

  return NextResponse.json(
    {
      ok,
      lastFetchAt: snapshot?.fetchedAt ?? null,
      staleSeconds,
      provider,
    },
    {
      status: ok ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
