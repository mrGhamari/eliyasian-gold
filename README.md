# قیمت طلا الیاسیان — Elyasian Gold Price

A single-page, Persian (RTL), SEO-friendly site showing live Iranian gold market prices, plus Elyasian's own buy/sell price for 18-karat gold (market rate + a fixed adjustment). Stateless: no database, no auth, no admin panel.

**Stack:** Next.js 15 (App Router, ISR) · TypeScript strict · Tailwind CSS · Vitest · Node 20+ · Docker (Liara).

## How it works

- The main page is ISR (`revalidate = 60`), so the served HTML always contains real price digits (SEO), regenerated at most once per minute.
- All data flows through one function, `getPrices()` (`src/lib/prices.ts`): provider fetch → zod parse/normalize → pricing engine → typed snapshot.
- After hydration the client polls `/api/price` every 45 s and updates numbers in place with zero layout shift.
- Money is **integer rials** everywhere internally (USD ounce is integer cents). The display layer converts to toman (÷10) with fa-IR digits. No float price math exists.

### Upstream quota protection (hard business constraint: 1500 req/day)

Upstream usage stays at ~1 request / 60 s regardless of traffic, enforced by three layers:

1. **In-memory 60 s TTL cache** in front of the provider in `getPrices()`. App Router route handlers are dynamic per-request, so this layer is what guarantees `/api/price` polling can't multiply upstream calls. Verified by unit test (`src/lib/prices.test.ts` proves 25 back-to-back calls → 1 provider fetch).
2. **Next.js Data Cache** on the real provider's inner `fetch` (`next: { revalidate: 60, tags: ['prices'] }`).
3. **ISR** on the page itself.

### Resilience

Upstream failure never produces an error page. The last successful snapshot is kept in memory (last-known-good) and served with its **original** timestamp; past `STALE_WARN_SECONDS` the UI shows «قیمت‌ها ممکن است به‌روز نباشند» and `/api/health` flips to 503. Cold start with upstream down renders HTTP 200 with a skeleton («در حال دریافت قیمت…») and the client retries every 5 s.

> **Single-instance assumption:** the in-memory cache and last-known-good live in process memory. This is correct for the deployment target (one long-running Node container on Liara). Scaling to multiple replicas would multiply upstream usage per replica and desynchronize staleness — revisit before scaling out.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PRICE_PROVIDER` | `mock` | `talasea` \| `brsapi` \| `mock`. Mock is the dev/test default; **talasea is the real provider** (public endpoint, no key). |
| `BRSAPI_KEY` | — | BrsApi key (brsapi is still a stub). **Server-side only — never `NEXT_PUBLIC_`.** |
| `PRICE_ADJ_SELL_RIALS` | `500000` | Sell adjustment in integer rials (market **+** 50,000 toman). |
| `PRICE_ADJ_BUY_RIALS` | `-500000` | Buy adjustment in integer rials (market **−** 50,000 toman; negative). |
| `PRICE_ADJ_ITEMS` | `gold_18` | Comma-separated item keys the adjustment applies to. Keys: `gold_18`, `coin_emami`, `coin_half`, `coin_quarter`, `ounce_global`. |
| `PRICE_FREEZE` | `false` | `true` withholds Elyasian buy/sell and shows the freeze banner; market data stays live. The banner also triggers automatically when the upstream halts trading (see Talasea below). |
| `STALE_WARN_SECONDS` | `600` | Staleness threshold for the UI warning and `/api/health` 503. |
| `SITE_URL` | `http://localhost:3000` | Public origin for canonical/OG/sitemap/robots. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | — | Optional staleness alert (see below). Silently off when unset. |

Pricing rules are read exclusively through `getRules()` (`src/lib/pricing/rules.ts`), so a DB-backed rules source can replace the env implementation later without touching any caller. Rule changes require a restart/redeploy.

## Local development

```bash
npm install
cp .env.example .env.local   # mock provider by default
npm run dev                  # http://localhost:3000
```

Scripts: `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`.

## Real provider: Talasea

`PRICE_PROVIDER=talasea` uses the public Talasea endpoint (`https://api.talasea.ir/api/market/getGoldPrice`, no API key). Details in `src/lib/providers/talasea.ts`:

- Upstream `price` is a numeric string in **toman per milligram (سوت)** of 18k gold — verified against published market rates on 2026-07-05. Normalized to integer rials/gram at the provider boundary: `price × 10,000`.
- Talasea supplies **only 18k gold** — no coins, no global ounce — so the «نرخ بازار» section hides itself automatically (it reappears if a future provider supplies those items).
- The upstream fetch uses the Next.js Data Cache (`revalidate: 60`) on top of the in-memory TTL cache, so the quota math from above is unchanged.
- Talasea's `disableBuy` / `disableSell` flags map to `upstreamFrozen`: if **either** side of trading is halted, the quote isn't safe to sell against, so the site behaves exactly as with `PRICE_FREEZE=true` (Elyasian prices withheld, freeze banner shown) until the flags clear. `PRICE_FREEZE` remains the manual override on top. The flags are optional in validation — if Talasea ever drops them, prices keep flowing (unfrozen) rather than failing the feed.

### BrsApi (stub, optional future provider)

`BrsApiProvider` remains an unwired stub — useful later if coin/ounce data is wanted, since Talasea doesn't provide it. Completing it requires the issued endpoint + one real sample response (field names must not be guessed); follow the TODO checklist in `src/lib/providers/brsapi.ts`. Until then `PRICE_PROVIDER=brsapi` degrades gracefully but fetches nothing.

## Deploying to Liara

```bash
npm i -g @liara/cli
liara login
liara deploy         # uses liara.json (platform: docker, port: 3000)
```

Set the env vars in the Liara dashboard (or `liara env set ...`): at minimum `PRICE_PROVIDER=talasea` and `SITE_URL=https://your-domain`.

**Domain/SSL:** add your custom domain in the Liara dashboard (Domains → add, point DNS at Liara) and enable the free SSL certificate; then update `SITE_URL` to the https origin so canonical/OG/sitemap URLs are correct.

The image is a multi-stage Node 20-alpine build of Next.js `output: 'standalone'`; it respects Liara's `PORT` env.

## Monitoring & alerting

- **`GET /api/health`** is the primary alerting surface: `{ ok, lastFetchAt, staleSeconds, provider }`, HTTP 200 when healthy, **503 when `staleSeconds > STALE_WARN_SECONDS`**. Point any external uptime monitor (UptimeRobot, Better Stack, …) at it.
- Fetch/parse failures are logged as structured JSON on stdout/stderr (Liara collects these).
- Optional Telegram alert: set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` to get one message on the transition to stale (throttled to 1 per 30 min). **Note:** `api.telegram.org` may be unreachable from Iranian datacenters — the external monitor on `/api/health` is the reliable path.

## Notes

- Sell price is `market + PRICE_ADJ_SELL_RIALS` and buy price is `market + PRICE_ADJ_BUY_RIALS` (buy adjustment is negative), so the shop sells above and buys below the market rate.
- fa-IR number formatting uses the standard Persian thousands separator «٬» (U+066C), e.g. «۱۰٬۱۰۰٬۰۰۰ تومان».
- A rounding hook exists in the pricing rules (round Elyasian prices to the nearest N rials, per-item capable); it defaults to N=1 (off).
