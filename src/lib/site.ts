/**
 * Public site origin — used for canonical URL, Open Graph, sitemap, robots.
 * Read at request time (every consumer is dynamic), so the runtime env set on
 * the host applies without rebuilding. `||` so an empty value also falls back.
 */
export const SITE_URL = (
  process.env.SITE_URL?.trim() || "http://localhost:3000"
).replace(/\/+$/, "");

export const SITE_NAME = "الیاسیان";

export const SITE_TITLE = "قیمت طلا الیاسیان | قیمت لحظه‌ای طلای ۱۸ عیار و سکه";

export const SITE_DESCRIPTION =
  "مشاهده قیمت لحظه‌ای طلای ۱۸ عیار، سکه امامی، نیم‌سکه، ربع‌سکه و انس جهانی — قیمت خرید و فروش طلا در الیاسیان.";

/** Shop address (single source of truth for the UI and JSON-LD). */
export const SHOP_ADDRESS =
  "پانزده خرداد شرقی، رو به روی بازار زرگرها، کوچه تکیه دولت، پلاک ۳۲ — طلا الیاسیان";

export const SHOP_LOCALITY = "تهران";
export const SHOP_REGION = "تهران";

/** Store coordinates for the JewelryStore/geo schema and the "map" link. */
export const SHOP_GEO = { lat: 35.678283, lng: 51.4214728 } as const;

/**
 * Phone numbers. `tel` is the raw dialable value (Latin digits, no separators);
 * `label` is the grouped form shown on screen.
 */
export const SHOP_PHONES = [
  { tel: "02133111972", label: "۰۲۱-۳۳۱۱۱۹۷۲" },
  { tel: "09125091374", label: "۰۹۱۲-۵۰۹-۱۳۷۴" },
  { tel: "09121469369", label: "۰۹۱۲-۱۴۶-۹۳۶۹" },
] as const;
