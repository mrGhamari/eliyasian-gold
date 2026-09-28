# قیمت طلا الیاسیان — Elyasian Gold Price

A single-page, Persian (RTL), SEO-friendly site showing live Iranian gold market prices, plus Elyasian's own buy/sell price for 18-karat gold (market rate + a fixed adjustment). Stateless: no database, no auth, no admin panel.

**Stack:** Next.js 15 (App Router) · TypeScript strict · Tailwind CSS · Vitest · Node 20+ · Docker (Liara).

## How it works

- Every page (plus `robots.txt` / `sitemap.xml`) renders **per request** (`dynamic = "force-dynamic"`), so the served HTML always contains current price digits (SEO) and uses the runtime env. Nothing is prerendered at `next build`, where the runtime env is absent — a static prerender would ship build-time (mock) prices and `localhost` URLs.
- All data flows through one function, `getPrices()` (`src/lib/prices.ts`): provider fetch → zod parse/normalize → pricing engine → typed snapshot.
- After hydration the client polls `/api/price` every 45 s and updates numbers in place with zero layout shift.
- Money is **integer rials** everywhere internally (USD ounce is integer cents). The display layer converts to toman (÷10) with fa-IR digits. No float price math exists.

### Upstream quota protection (hard business constraint: 1500 req/day)

Upstream usage stays at ~1 request / 60 s regardless of traffic, enforced by the **in-memory 60 s TTL cache** in front of the provider in `getPrices()` (verified in `src/lib/prices.test.ts`):

- at most **one upstream attempt per 60 s, successful or failed** — including a cold start while upstream is down;
- **single-flight**: concurrent requests on an expired cache share one in-flight upstream call.

The real provider's `fetch` deliberately uses `cache: "no-store"`: the Next.js Data Cache would return an old body (stale-while-revalidate, retained when revalidation fails) that we'd stamp with a fresh `fetchedAt`, hiding outages from the staleness warning and `/api/health`. It also has a 5 s timeout, so a hung upstream can't hang page renders.

### Resilience

Upstream failure never produces an error page. The last successful snapshot is kept in memory (last-known-good) and served with its **original** timestamp; past `STALE_WARN_SECONDS` the UI shows «قیمت‌ها ممکن است به‌روز نباشند» and `/api/health` flips to 503. Cold start with upstream down renders HTTP 200 with a skeleton («در حال دریافت قیمت…»); the client polls every 5 s and the server retries upstream once per 60 s.

> **Single-instance assumption:** the in-memory cache and last-known-good live in process memory. This is correct for the deployment target (one long-running Node container on Liara). Scaling to multiple replicas would multiply upstream usage per replica and desynchronize staleness — revisit before scaling out.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PRICE_PROVIDER` | `talasea` in production, `mock` otherwise | `talasea` \| `mock`. **Fail-closed in production:** an unknown value serves no prices (never mock) and `/api/health` returns 503. `mock` is refused in production too unless `ALLOW_MOCK_IN_PRODUCTION=true` (staging only), and mock data always shows a red «داده‌های آزمایشی» banner. |
| `ALLOW_MOCK_IN_PRODUCTION` | `false` | Staging-only escape hatch for `PRICE_PROVIDER=mock` in a production build. Never set on the real site. |
| `PRICE_ADJ_SELL_RIALS` | `500000` | Sell adjustment in integer rials (market **+** 50,000 toman). |
| `PRICE_ADJ_BUY_RIALS` | `-500000` | Buy adjustment in integer rials (market **−** 50,000 toman; negative). If it exceeds the sell adjustment (e.g. a missing minus sign) prices are **frozen automatically**. Integer envs must be whole numbers (`1e6` / `500000abc` are rejected). |
| `PRICE_ADJ_ITEMS` | `gold_18` | Comma-separated item keys the adjustment applies to. Keys: `gold_18`, `coin_emami`, `coin_half`, `coin_quarter`, `ounce_global`. |
| `PRICE_FREEZE` | `false` | `true` withholds Elyasian buy/sell and shows the freeze banner; market data stays live. The banner also triggers automatically when the upstream halts trading (see Talasea below). |
| `STALE_WARN_SECONDS` | `600` | Staleness threshold for the UI warning and `/api/health` 503. |
| `SITE_URL` | `http://localhost:3000` | Public origin for canonical/OG/sitemap/robots. Read at runtime — no rebuild needed. |
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
- The upstream fetch bypasses the Next.js Data Cache (`no-store`) with a 5 s timeout; the in-memory TTL cache alone enforces the quota (see above).
- Talasea's `disableBuy` / `disableSell` flags map to `upstreamFrozen`: if **either** side of trading is halted, the quote isn't safe to sell against, so the site behaves exactly as with `PRICE_FREEZE=true` (Elyasian prices withheld, freeze banner shown) until the flags clear. `PRICE_FREEZE` remains the manual override on top. The flags are optional in validation — if Talasea ever drops them, prices keep flowing (unfrozen) rather than failing the feed.

## GitHub Pages (current live site)

`.github/workflows/pages.yml` publishes a **static** build to `https://<owner>.github.io/<repo>/` on every push to `main` and every ~10 minutes. One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

How the static build differs (`scripts/build-pages.sh`, which builds from a temporary copy; the server build is untouched):

- No server: `/api/*` is dropped, pages render once at build time, and the client polls a static `price.json` instead of `/api/price`.
- Prices are as fresh as the last scheduled build (~10 min, sometimes later — GitHub can delay scheduled runs). `STALE_WARN_SECONDS=1800` there, and staleness is computed from `fetchedAt` on the client clock.
- If the upstream fetch fails, the build fails and the previous deployment stays live; mock data is never deployed.
- No `/api/health`; monitor the workflow's runs instead.
- GitHub disables scheduled workflows in public repos after 60 days without repository activity.

For real-time prices and health monitoring, deploy the server build (Docker) to a host.

## Deploying to Liara

### Manual

```bash
npm i -g @liara/cli
liara login
liara deploy         # uses liara.json (platform: docker, port: 3000)
```

Set the env vars in the Liara dashboard (or `liara env set ...`): at minimum `SITE_URL=https://your-domain` (and `PRICE_PROVIDER=talasea`, the production default). Env is read at runtime, so no rebuild is needed after changing it.

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
