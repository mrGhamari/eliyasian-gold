import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("omits unknown facts instead of guessing them", async () => {
    const { buildJsonLd } = await loadSeo("https://example.ir");
    const graph = buildJsonLd()["@graph"] as Node[];
    const store = byType(graph, "JewelryStore");
    expect(store).not.toHaveProperty("openingHoursSpecification");
    expect(store).not.toHaveProperty("sameAs");
    expect(byType(graph, "WebPage")).not.toHaveProperty("dateModified");
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
