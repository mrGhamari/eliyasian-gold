import { afterEach, describe, expect, it, vi } from "vitest";
import type { PriceResult } from "./prices";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadSeo(siteUrl: string) {
  vi.stubEnv("SITE_URL", siteUrl);
  vi.resetModules();
  return import("./seo");
}

type Node = Record<string, unknown>;
const byType = (graph: Node[], type: string) =>
  graph.find((n) => n["@type"] === type) as Node;

describe("SITE_URL normalization", () => {
  it("lowercases the host and drops the trailing slash", async () => {
    vi.stubEnv("SITE_URL", "https://mrGhamari.github.io/eliyasian-gold/");
    vi.resetModules();
    const { SITE_URL } = await import("./site");
    expect(SITE_URL).toBe("https://mrghamari.github.io/eliyasian-gold");
  });
});

describe("buildJsonLd", () => {
  it("describes the store, website and page as one linked graph", async () => {
    const { buildJsonLd } = await loadSeo("https://example.ir");
    const graph = buildJsonLd({ dateModified: "2026-09-28T07:37:40.000Z" })[
      "@graph"
    ] as Node[];

    const store = byType(graph, "JewelryStore");
    const site = byType(graph, "WebSite");
    const page = byType(graph, "WebPage");

    expect(store["@id"]).toBe("https://example.ir/#store");
    expect(store.url).toBe("https://example.ir/");
    expect(store.image).toBe("https://example.ir/opengraph-image.png");
    expect((store.address as Node).addressCountry).toBe("IR");
    expect(site.publisher).toEqual({ "@id": "https://example.ir/#store" });
    expect(page.about).toEqual({ "@id": "https://example.ir/#store" });
    expect(page.dateModified).toBe("2026-09-28T07:37:40.000Z");
  });

  it("keeps a GitHub Pages base path in every absolute URL", async () => {
    const { buildJsonLd } = await loadSeo(
      "https://mrghamari.github.io/eliyasian-gold",
    );
    const graph = buildJsonLd()["@graph"] as Node[];
    expect(byType(graph, "JewelryStore").logo).toBe(
      "https://mrghamari.github.io/eliyasian-gold/apple-icon.png",
    );
    expect(byType(graph, "WebPage").url).toBe(
      "https://mrghamari.github.io/eliyasian-gold/",
    );
  });

  it("publishes the opening hours: Saturday–Thursday 10:00–18:00", async () => {
    const { buildJsonLd } = await loadSeo("https://example.ir");
    const store = byType(buildJsonLd()["@graph"] as Node[], "JewelryStore");
    expect(store.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "https://schema.org/Saturday",
          "https://schema.org/Sunday",
          "https://schema.org/Monday",
          "https://schema.org/Tuesday",
          "https://schema.org/Wednesday",
          "https://schema.org/Thursday",
        ],
        opens: "10:00",
        closes: "18:00",
      },
    ]);
  });

  it("gives the store a priceRange", async () => {
    const { buildJsonLd } = await loadSeo("https://example.ir");
    const store = byType(buildJsonLd()["@graph"] as Node[], "JewelryStore");
    expect(store.priceRange).toBe("$$");
  });

  it("mirrors the visible FAQ in a FAQPage tied to the page", async () => {
    const { buildJsonLd } = await loadSeo("https://example.ir");
    const { FAQ } = await import("./faq");
    const faq = byType(buildJsonLd()["@graph"] as Node[], "FAQPage");
    expect(faq.isPartOf).toEqual({ "@id": "https://example.ir/#webpage" });
    expect(faq.mainEntity).toEqual(
      FAQ.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    );
  });

  it("omits unknown facts instead of guessing them", async () => {
    const { buildJsonLd } = await loadSeo("https://example.ir");
    const graph = buildJsonLd()["@graph"] as Node[];
    expect(byType(graph, "JewelryStore")).not.toHaveProperty("sameAs");
    expect(byType(graph, "WebPage")).not.toHaveProperty("dateModified");
  });
});

describe("buildPriceMeta", () => {
  function result(overrides: Partial<PriceResult> = {}, snapshot: Node = {}) {
    return {
      provider: "talasea",
      staleSeconds: 30,
      stale: false,
      staleWarnSeconds: 600,
      snapshot: {
        items: [
          {
            key: "gold_18",
            label: "گرم طلای ۱۸ عیار",
            currency: "IRR",
            marketAmount: 255_440_000,
            elyasianSellRials: 255_940_000,
            elyasianBuyRials: 254_940_000,
          },
        ],
        fetchedAt: "2026-10-31T07:33:41.439Z",
        source: "talasea",
        frozen: false,
        ...snapshot,
      },
      ...overrides,
    } as PriceResult;
  }

  it("puts today's sell price in the title and both prices in the description", async () => {
    const { buildPriceMeta } = await loadSeo("https://example.ir");
    const meta = buildPriceMeta(result());
    expect(meta.title).toBe(
      "قیمت طلا امروز ۲۵٬۵۹۴٬۰۰۰ تومان | طلای ۱۸ عیار — طلا الیاسیان",
    );
    expect(meta.description).toContain("امروز ۲۵٬۵۹۴٬۰۰۰ تومان");
    expect(meta.description).toContain("قیمت خرید ۲۵٬۴۹۴٬۰۰۰ تومان");
  });

  it.each([
    ["no data", result({ snapshot: null })],
    ["stale data", result({ stale: true })],
    ["mock data", result({}, { mock: true })],
    ["frozen prices", result({}, { frozen: true })],
    ["no shop price", result({}, { items: [] })],
  ])("falls back to the static copy on %s", async (_, input) => {
    const { buildPriceMeta } = await loadSeo("https://example.ir");
    const { SITE_TITLE, SITE_DESCRIPTION } = await import("./site");
    expect(buildPriceMeta(input)).toEqual({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    });
  });
});

describe("jsonLdScript", () => {
  it("escapes < so a value cannot close the script tag", async () => {
    const { jsonLdScript } = await loadSeo("https://example.ir");
    expect(jsonLdScript({ x: "</script><b>" })).not.toContain("</script>");
  });
});

describe("formatPersianDate", () => {
  it("formats the Tehran date in the Persian calendar, weekday first", async () => {
    const { formatPersianDate } = await loadSeo("https://example.ir");
    // 2026-09-28 07:40 UTC = Monday 6 Mehr 1405 in Tehran.
    expect(formatPersianDate(new Date("2026-09-28T07:40:00Z"))).toBe(
      "دوشنبه ۶ مهر ۱۴۰۵",
    );
  });
});
