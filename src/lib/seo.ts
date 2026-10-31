import { FAQ } from "./faq";
import type { PriceResult } from "./prices";
import { formatRialsAsToman } from "./pricing/money";
import {
  SHOP_GEO,
  SHOP_LOCALITY,
  SHOP_OPENING_HOURS,
  SHOP_PHONES,
  SHOP_PRICE_RANGE,
  SHOP_REGION,
  SHOP_SAME_AS,
  SHOP_STREET,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "./site";

/**
 * Page <title> and meta description with today's 18k price in them — a price
 * in the search result snippet is what earns the click for "قیمت طلا امروز".
 * Falls back to the static copy whenever the number would be wrong to show:
 * no data, stale data, mock data, or prices frozen (no shop price at all).
 */
export function buildPriceMeta(result: PriceResult): {
  title: string;
  description: string;
} {
  const snapshot = result.snapshot;
  const gold = snapshot?.items.find((i) => i.key === "gold_18");
  if (
    !snapshot ||
    result.stale ||
    snapshot.mock ||
    snapshot.frozen ||
    gold?.elyasianSellRials === undefined ||
    gold.elyasianBuyRials === undefined
  ) {
    return { title: SITE_TITLE, description: SITE_DESCRIPTION };
  }

  const sell = formatRialsAsToman(gold.elyasianSellRials);
  const buy = formatRialsAsToman(gold.elyasianBuyRials);
  return {
    title: `قیمت طلا امروز ${sell} تومان | طلای ۱۸ عیار — ${SITE_NAME}`,
    description: `قیمت فروش هر گرم طلای ۱۸ عیار در ${SITE_NAME} امروز ${sell} تومان و قیمت خرید ${buy} تومان. نرخ لحظه‌ای با به‌روزرسانی خودکار، آدرس و تلفن فروشگاه در بازار زرگرهای تهران.`,
  };
}

/**
 * schema.org JSON-LD for the home page. One @graph with stable @ids so
 * search engines read the store, the website and the page as one entity:
 * the JewelryStore (local business: name, address, geo, phones — must match
 * the Google Maps listing exactly), the WebSite, the WebPage whose
 * dateModified tracks the last successful price fetch, and the FAQPage that
 * mirrors the visible FAQ section.
 */
export function buildJsonLd({
  pageUrl = `${SITE_URL}/`,
  dateModified,
}: {
  pageUrl?: string;
  /** ISO timestamp of the prices shown on the page, if any. */
  dateModified?: string;
} = {}) {
  const storeId = `${SITE_URL}/#store`;
  const websiteId = `${SITE_URL}/#website`;
  const imageUrl = `${SITE_URL}/opengraph-image.png`;
  const logoUrl = `${SITE_URL}/apple-icon.png`;

  const store: Record<string, unknown> = {
    "@type": "JewelryStore",
    "@id": storeId,
    name: SITE_NAME,
    url: pageUrl,
    image: imageUrl,
    logo: logoUrl,
    telephone: SHOP_PHONES.map((p) => p.tel),
    address: {
      "@type": "PostalAddress",
      streetAddress: SHOP_STREET,
      addressLocality: SHOP_LOCALITY,
      addressRegion: SHOP_REGION,
      addressCountry: "IR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SHOP_GEO.lat,
      longitude: SHOP_GEO.lng,
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${SHOP_GEO.lat},${SHOP_GEO.lng}`,
    areaServed: { "@type": "City", name: SHOP_LOCALITY },
    currenciesAccepted: "IRR",
    priceRange: SHOP_PRICE_RANGE,
  };
  if (SHOP_OPENING_HOURS.length > 0) {
    store.openingHoursSpecification = SHOP_OPENING_HOURS.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => `https://schema.org/${d}`),
      opens: h.opens,
      closes: h.closes,
    }));
  }
  if (SHOP_SAME_AS.length > 0) store.sameAs = [...SHOP_SAME_AS];

  const page: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    inLanguage: "fa-IR",
    isPartOf: { "@id": websiteId },
    about: { "@id": storeId },
    primaryImageOfPage: { "@type": "ImageObject", url: imageUrl },
  };
  if (dateModified) page.dateModified = dateModified;

  return {
    "@context": "https://schema.org",
    "@graph": [
      store,
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: "fa-IR",
        publisher: { "@id": storeId },
      },
      page,
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        isPartOf: { "@id": `${pageUrl}#webpage` },
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };
}

/**
 * JSON for a <script type="application/ld+json">, with "<" escaped so a
 * value can never close the script tag early.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** «دوشنبه ۶ مهر ۱۴۰۵» — today's Persian (Solar Hijri) date in Tehran. */
export function formatPersianDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
}
