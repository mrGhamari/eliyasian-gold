#!/usr/bin/env bash
# Static export for GitHub Pages → ./out
#
# Static hosting has no server, so the server-only parts (API routes and
# per-request rendering) can't exist there. Rather than weakening the server
# build, this builds from a temporary copy with those parts adapted:
#   - src/app/api is removed;
#   - force-dynamic becomes force-static (rendered once, at build time);
#   - a static /price.json replaces /api/price for client polling.
# Prices are fetched at build time, so a scheduled workflow rebuilds the site
# to keep them current. The build fails (and the previous deployment stays
# live) if no real snapshot could be fetched.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

tar -C "$ROOT" \
  --exclude=./node_modules --exclude=./.next --exclude=./out --exclude=./.git \
  -cf - . | tar -C "$WORK" -xf -
ln -s "$ROOT/node_modules" "$WORK/node_modules"
cd "$WORK"

rm -rf src/app/api
for f in src/app/layout.tsx src/app/robots.ts src/app/sitemap.ts; do
  if ! grep -q 'export const dynamic = "force-dynamic";' "$f"; then
    echo "build-pages: expected force-dynamic in $f" >&2
    exit 1
  fi
  sed -i 's/export const dynamic = "force-dynamic";/export const dynamic = "force-static";/' "$f"
done

mkdir -p src/app/price.json
cat > src/app/price.json/route.ts <<'TS'
import { getPrices } from "@/lib/prices";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(await getPrices());
}
TS

BASE_PATH="${PAGES_BASE_PATH:-}"
STATIC_EXPORT=true \
NEXT_PUBLIC_STATIC_PRICES=true \
NEXT_PUBLIC_PRICE_ENDPOINT="$BASE_PATH/price.json" \
  npx next build

node -e '
  const r = JSON.parse(require("fs").readFileSync("out/price.json", "utf8"));
  if (!r.snapshot) {
    console.error("build-pages: no price snapshot (upstream down?) — not deploying");
    process.exit(1);
  }
  if (r.snapshot.mock && process.env.ALLOW_MOCK_IN_PRODUCTION !== "true") {
    console.error("build-pages: refusing to deploy mock prices");
    process.exit(1);
  }
  console.log("build-pages: snapshot from", r.provider, "fetched at", r.snapshot.fetchedAt);
'

rm -rf "$ROOT/out"
cp -R out "$ROOT/out"
