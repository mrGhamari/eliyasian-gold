/**
 * Public site URL (origin + optional path, no trailing slash) — used for
 * canonical URL, Open Graph, sitemap, robots and JSON-LD. Read at request
 * time (every consumer is dynamic), so the runtime env set on the host
 * applies without rebuilding. `||` so an empty value also falls back.
 * Parsed through URL so the host is lowercased (search engines treat
 * `mrGhamari.github.io` and `mrghamari.github.io` as one host, but the
 * canonical should be spelled one consistent way).
 */
export const SITE_URL = normalizeSiteUrl(
  process.env.SITE_URL?.trim() || "http://localhost:3000",
);

function normalizeSiteUrl(raw: string): string {
  const url = new URL(raw);
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/** Business name, as it should appear on Google Maps and in search results. */
export const SITE_NAME = "طلا الیاسیان";

export const SITE_TITLE =
  "قیمت طلا امروز | خرید و فروش طلای ۱۸ عیار — طلا الیاسیان";

export const SITE_DESCRIPTION =
  "قیمت لحظه‌ای خرید و فروش طلای ۱۸ عیار در طلا الیاسیان، بازار زرگرهای تهران (پانزده خرداد شرقی). نرخ روز طلا با به‌روزرسانی خودکار، تلفن، آدرس و مسیریابی فروشگاه.";

/** Shop address (single source of truth for the UI and JSON-LD). */
export const SHOP_ADDRESS =
  "پانزده خرداد شرقی، رو به روی بازار زرگرها، کوچه تکیه دولت، پلاک ۳۲ — طلا الیاسیان";

/** Street part of the address for schema.org PostalAddress. */
export const SHOP_STREET =
  "پانزده خرداد شرقی، رو به روی بازار زرگرها، کوچه تکیه دولت، پلاک ۳۲";
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

/**
 * Opening hours for JSON-LD (schema.org OpeningHoursSpecification). Empty =
 * omitted: never publish guessed hours — wrong hours on Google are worse
 * than none. Example:
 *   { days: ["Saturday","Sunday","Monday","Tuesday","Wednesday"], opens: "09:30", closes: "19:00" }
 */
export const SHOP_OPENING_HOURS: readonly {
  days: readonly (
    | "Saturday"
    | "Sunday"
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
  )[];
  opens: string;
  closes: string;
}[] = [
  {
    days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    opens: "10:00",
    closes: "18:00",
  },
];

/** The same hours, as shown on the page. Keep in sync with SHOP_OPENING_HOURS. */
export const SHOP_HOURS_LABEL = "شنبه تا پنجشنبه، ساعت ۱۰ صبح تا ۶ عصر";

/**
 * The shop's own profile pages (Google Maps listing, Instagram, Neshan,
 * Balad, …) for JSON-LD `sameAs`, which ties this site to those profiles.
 * Only the shop's own listing URLs belong here — not generic map links.
 */
export const SHOP_SAME_AS: readonly string[] = [];

/**
 * One-tap directions to the shop, built from SHOP_GEO. Each opens the map
 * app (or site) with the shop as the destination.
 * Google Maps and Waze use their documented URL schemes; Neshan and Balad
 * (the navigation apps most Iranian users have) use their public map URLs.
 */
export const SHOP_DIRECTIONS = [
  {
    id: "neshan",
    label: "نشان",
    href: `https://neshan.org/maps/@${SHOP_GEO.lat},${SHOP_GEO.lng},17z,0p`,
  },
  {
    id: "balad",
    label: "بلد",
    href: `https://balad.ir/location?latitude=${SHOP_GEO.lat}&longitude=${SHOP_GEO.lng}&zoom=17`,
  },
  {
    id: "google",
    label: "گوگل‌مپ",
    href: `https://www.google.com/maps/dir/?api=1&destination=${SHOP_GEO.lat},${SHOP_GEO.lng}`,
  },
  {
    id: "waze",
    label: "ویز",
    href: `https://waze.com/ul?ll=${SHOP_GEO.lat},${SHOP_GEO.lng}&navigate=yes`,
  },
] as const;
