import { NextResponse } from "next/server";
import { getPrices } from "@/lib/prices";

// Dynamic per request, but getPrices() serves from its 60s in-memory cache
// (plus the Data Cache inside the real provider), so polling here does NOT
// produce per-request upstream hits — verified by unit test.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getPrices();
  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" },
  });
}
